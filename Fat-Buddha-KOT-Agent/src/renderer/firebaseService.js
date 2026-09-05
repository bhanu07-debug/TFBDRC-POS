import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js';
import {
  initializeFirestore,
  getFirestore,
  collection,
  query,
  where,
  onSnapshot,
  doc,
  getDoc,
  updateDoc,
  runTransaction
} from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js';

class AgentFirebaseService {
  constructor() {
    this.app = null;
    this.db = null;
    this.unsubscribeListener = null;
    this.isConnected = false;
    this.statusListeners = [];
  }

  async init(firebaseConfig) {
    try {
      if (!firebaseConfig) {
        throw new Error('Missing Firebase configuration');
      }

      this.app = initializeApp(firebaseConfig);
      try {
        this.db = initializeFirestore(this.app, {
          experimentalAutoDetectLongPolling: true,
        }, firebaseConfig.firestoreDatabaseId || undefined);
      } catch (e) {
        this.db = getFirestore(this.app, firebaseConfig.firestoreDatabaseId || undefined);
      }

      // Verify connection
      await this.checkConnection();
      return true;
    } catch (err) {
      console.error('[FirebaseService] Initialization error:', err);
      this.setConnected(false, err.message);
      return false;
    }
  }

  onConnectionChange(listener) {
    this.statusListeners.push(listener);
    listener(this.isConnected);
  }

  setConnected(status, error = null) {
    this.isConnected = status;
    this.statusListeners.forEach(l => l(status, error));
  }

  async checkConnection() {
    if (!this.db) return false;
    try {
      // Light ping to health/test document or settings
      await getDoc(doc(this.db, 'settings', 'restaurant_config'));
      this.setConnected(true);
      return true;
    } catch (err) {
      if (err?.code === 'unavailable') {
        this.setConnected(false, 'Offline / Reconnecting');
      } else {
        this.setConnected(true); // Connected to client cache/offline queue
      }
      return false;
    }
  }

  /**
   * Subscribes to real-time PENDING print jobs for the configured destination (KITCHEN / RECEPTION).
   */
  subscribeToPrintJobs(destination, onJobHandler, onError) {
    if (this.unsubscribeListener) {
      this.unsubscribeListener();
      this.unsubscribeListener = null;
    }

    if (!this.db) {
      onError(new Error('Database not initialized'));
      return;
    }

    const dest = (destination || 'KITCHEN').toUpperCase();

    // Query for PENDING jobs matching this destination
    const jobsRef = collection(this.db, 'printJobs');
    const q = query(
      jobsRef,
      where('destination', '==', dest),
      where('status', '==', 'PENDING')
    );

    this.unsubscribeListener = onSnapshot(
      q,
      (snapshot) => {
        this.setConnected(true);
        snapshot.docChanges().forEach((change) => {
          if (change.type === 'added' || change.type === 'modified') {
            const jobData = { id: change.doc.id, ...change.doc.data() };
            if (jobData.status === 'PENDING') {
              onJobHandler(jobData);
            }
          }
        });
      },
      (error) => {
        console.error('[FirebaseService] Firestore snapshot error:', error);
        this.setConnected(false, error.message);
        if (onError) onError(error);
      }
    );

    return () => {
      if (this.unsubscribeListener) {
        this.unsubscribeListener();
        this.unsubscribeListener = null;
      }
    };
  }

  /**
   * ATOMIC CLAIM & PRINT:
   * Prevents duplicate printing across multiple agents or duplicate event snapshots.
   */
  async claimAndPrintJob(jobId, printExecutor) {
    if (!this.db) throw new Error('Database not initialized');
    const jobRef = doc(this.db, 'printJobs', jobId);

    let jobPayload = null;

    // STEP 1: Atomic Claim via Transaction
    try {
      await runTransaction(this.db, async (transaction) => {
        const jobSnap = await transaction.get(jobRef);
        if (!jobSnap.exists()) {
          throw new Error(`Print job ${jobId} does not exist`);
        }

        const data = jobSnap.data();
        // IDEMPOTENCY CHECK: if already PRINTED or PRINTING by another agent, abort!
        if (data.status === 'PRINTED') {
          throw new Error('JOB_ALREADY_PRINTED');
        }
        if (data.status === 'PRINTING') {
          throw new Error('JOB_ALREADY_PRINTING');
        }

        jobPayload = { id: jobSnap.id, ...data };

        // Mark as PRINTING to claim ownership
        transaction.update(jobRef, {
          status: 'PRINTING',
          claimedAt: new Date().toISOString(),
          attempts: (data.attempts || 0) + 1
        });
      });
    } catch (err) {
      if (err.message === 'JOB_ALREADY_PRINTED' || err.message === 'JOB_ALREADY_PRINTING') {
        console.warn(`[FirebaseService] Skipped duplicate print for job ${jobId}: ${err.message}`);
        return { success: false, skipped: true, reason: err.message };
      }
      throw err;
    }

    // STEP 2: Execute Physical Print
    try {
      const printResult = await printExecutor(jobPayload);
      if (!printResult.success) {
        throw new Error(printResult.error || 'Physical printer failed');
      }

      // STEP 3: Mark PRINTED in Firestore
      const nowIso = new Date().toISOString();
      await updateDoc(jobRef, {
        status: 'PRINTED',
        printedAt: nowIso,
        error: null
      });

      // Also update linked KOT document if present
      if (jobPayload.kotId) {
        try {
          const kotRef = doc(this.db, 'kots', jobPayload.kotId);
          await updateDoc(kotRef, {
            status: 'PRINTED',
            updatedAt: nowIso
          });
        } catch (kotErr) {
          console.warn('[FirebaseService] Could not update linked KOT status:', kotErr);
        }
      }

      return { success: true, job: jobPayload };
    } catch (printErr) {
      console.error(`[FirebaseService] Print execution failed for job ${jobId}:`, printErr);
      // STEP 4: Mark FAILED with error details (keeps job in Firestore for safe retry)
      try {
        await updateDoc(jobRef, {
          status: 'FAILED',
          error: printErr.message || 'Unknown printer failure',
          failedAt: new Date().toISOString()
        });
      } catch (markErr) {
        console.error('[FirebaseService] Failed to record FAILED status in Firestore:', markErr);
      }
      return { success: false, error: printErr.message };
    }
  }

  /**
   * Resets a FAILED print job back to PENDING so it can be retried safely.
   */
  async retryJob(jobId) {
    if (!this.db) throw new Error('Database not initialized');
    const jobRef = doc(this.db, 'printJobs', jobId);
    await updateDoc(jobRef, {
      status: 'PENDING',
      error: null,
      retriedAt: new Date().toISOString()
    });
    return { success: true };
  }
}

export const firebaseService = new AgentFirebaseService();
