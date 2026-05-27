import { Worker, Job } from 'bullmq';
import { redisConnection, QUEUE_NAME, isRedisAvailable } from '../config/queue';
import { Assignment } from '../models/Assignment';
import { generateWorksheet } from '../services/aiService';
import { emitAssignmentUpdate } from '../config/socket';

// Worker task processor
export const processAssignmentJob = async (job: Job) => {
  const { assignmentId, title, subject, classLevel, schoolName, questionConfigs, imagePath } = job.data;

  console.log(`👷 Worker processing assignment ID: ${assignmentId}, Job ID: ${job.id}`);

  try {
    // 1. Update Status to processing
    emitAssignmentUpdate(assignmentId, {
      status: 'processing',
      progress: 20,
      message: 'Processing parameters and document image...'
    });

    await Assignment.findByIdAndUpdate(assignmentId, { status: 'processing' });

    // 2. Stream generation start
    emitAssignmentUpdate(assignmentId, {
      status: 'processing',
      progress: 50,
      message: 'Analyzing content with VedaAI visual models...'
    });

    // 3. Call AI Service
    const aiResult = await generateWorksheet({
      title,
      subject,
      classLevel,
      schoolName,
      dueDate: '', // handled separately
      questionConfigs,
      imagePath
    });

    emitAssignmentUpdate(assignmentId, {
      status: 'processing',
      progress: 80,
      message: 'Validating and formatting generated worksheet structure...'
    });

    // 4. Update MongoDB assignment with questions and completed state
    const completedAssignment = await Assignment.findByIdAndUpdate(
      assignmentId,
      {
        title: aiResult.title || title,
        subject: aiResult.subject || subject,
        classLevel: aiResult.classLevel || classLevel,
        schoolName: aiResult.schoolName || schoolName,
        questions: aiResult.questions,
        totalMarks: aiResult.totalMarks,
        timeAllowed: aiResult.timeAllowed || 45,
        status: 'completed'
      },
      { new: true }
    );

    // 6. Invalidate Redis Caches
    if (isRedisAvailable()) {
      try {
        // 1. Find and delete all paginated search/filter list caches
        const listKeys = await redisConnection.keys('cache:assignments:*');
        if (listKeys.length > 0) {
          await redisConnection.del(...listKeys);
          console.log(`⚡ Worker invalidated ${listKeys.length} list caches`);
        }
        
        // 2. Delete specific assignment detail cache
        await redisConnection.del(`cache:assignment:${assignmentId}`);
        console.log(`⚡ Worker invalidated detail cache for assignment: ${assignmentId}`);
      } catch (cacheErr: any) {
        console.warn('⚠️ Redis Cache Invalidation inside worker failed:', cacheErr.message);
      }
    }

    // 5. Emit completed event with final data
    emitAssignmentUpdate(assignmentId, {
      status: 'completed',
      progress: 100,
      message: 'Worksheet generated successfully!',
      data: completedAssignment
    });

    console.log(`✅ Worker completed assignment ID: ${assignmentId} successfully!`);
    return completedAssignment;
  } catch (error: any) {
    console.error(`❌ Worker failed on assignment ID: ${assignmentId}:`, error);

    await Assignment.findByIdAndUpdate(assignmentId, {
      status: 'failed',
      error: error.message || 'AI generation failed'
    });

    emitAssignmentUpdate(assignmentId, {
      status: 'failed',
      progress: 100,
      error: error.message || 'AI generation failed'
    });

    throw error;
  }
};

// Start BullMQ Worker only if Redis is available
export const initWorker = () => {
  if (isRedisAvailable()) {
    const worker = new Worker(QUEUE_NAME, processAssignmentJob, {
      connection: redisConnection as any,
      concurrency: 2
    });

    worker.on('completed', (job) => {
      console.log(`🎉 Queue Worker completed job ${job.id}`);
    });

    worker.on('failed', (job, err) => {
      console.error(`💥 Queue Worker failed job ${job?.id}:`, err.message);
    });

    console.log('✅ BullMQ Queue Worker initialized successfully.');
    return worker;
  } else {
    console.log('⚠️ Skipping BullMQ worker startup (Running in dual-mode direct fallback).');
    return null;
  }
};
