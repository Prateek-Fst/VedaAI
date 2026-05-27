import { Request, Response } from 'express';
import { Assignment } from '../models/Assignment';
import { assignmentQueue, isRedisAvailable, redisConnection } from '../config/queue';
import { processAssignmentJob } from '../workers/assignmentWorker';

// Cache Invalidation Helper
export const invalidateCache = async (assignmentId?: string) => {
  if (!isRedisAvailable()) return;
  try {
    // 1. Find and delete all paginated search/filter list caches
    const listKeys = await redisConnection.keys('cache:assignments:*');
    if (listKeys.length > 0) {
      await redisConnection.del(...listKeys);
      console.log(`⚡ Invalidated ${listKeys.length} list caches`);
    }
    
    // 2. Delete specific assignment detail cache if provided
    if (assignmentId) {
      await redisConnection.del(`cache:assignment:${assignmentId}`);
      console.log(`⚡ Invalidated detail cache for assignment: ${assignmentId}`);
    }
  } catch (err: any) {
    console.warn('⚠️ Redis Cache Invalidation failed:', err.message);
  }
};

// 1. Create a new Assignment
export const createAssignment = async (req: Request, res: Response) => {
  try {
    const { title, subject, classLevel, schoolName, dueDate, questionConfigs } = req.body;
    const file = req.file;

    if (!title || !subject || !classLevel || !dueDate) {
      return res.status(400).json({ error: 'Missing required assignment fields.' });
    }

    let parsedConfigs = [];
    try {
      parsedConfigs = typeof questionConfigs === 'string' ? JSON.parse(questionConfigs) : questionConfigs;
    } catch (e) {
      return res.status(400).json({ error: 'Invalid questionConfigs format. Must be JSON.' });
    }

    let totalMarks = 0;
    parsedConfigs.forEach((c: any) => {
      totalMarks += (c.count || 0) * (c.marks || 0);
    });

    const assignment = new Assignment({
      title,
      subject,
      classLevel,
      schoolName: schoolName || 'Delhi Public School',
      dueDate: new Date(dueDate),
      imageUrl: file ? `/uploads/${file.filename}` : undefined,
      status: 'pending',
      totalMarks,
      questions: []
    });

    await assignment.save();

    // Invalidate cached lists
    await invalidateCache();

    const jobData = {
      assignmentId: assignment._id.toString(),
      title,
      subject,
      classLevel,
      schoolName: schoolName || 'Delhi Public School',
      questionConfigs: parsedConfigs,
      imagePath: file ? file.path : undefined
    };

    if (isRedisAvailable() && assignmentQueue) {
      await assignmentQueue.add(`generate-${assignment._id}`, jobData, {
        attempts: 2,
        backoff: 5000
      });
      console.log(`📡 Job queued successfully in BullMQ for assignment: ${assignment._id}`);
    } else {
      console.log(`⚠️ Redis offline. Processing assignment: ${assignment._id} synchronously in background thread.`);
      process.nextTick(async () => {
        try {
          await processAssignmentJob({ data: jobData } as any);
        } catch (err) {
          console.error('Error running direct generation job:', err);
        }
      });
    }

    return res.status(201).json(assignment);
  } catch (error: any) {
    console.error('Error in createAssignment controller:', error);
    return res.status(500).json({ error: error.message || 'Internal server error' });
  }
};

// 2. Get all Assignments (with Redis Caching & Search Filters)
export const getAssignments = async (req: Request, res: Response) => {
  try {
    const { search, status } = req.query;
    const query: any = {};

    if (search) {
      query.title = { $regex: search, $options: 'i' };
    }

    if (status) {
      query.status = status;
    }

    const cacheKey = `cache:assignments:search:${search || ''}:status:${status || ''}`;

    // Check Redis Cache if online
    if (isRedisAvailable()) {
      try {
        const cachedData = await redisConnection.get(cacheKey);
        if (cachedData) {
          console.log(`⚡ Cache HIT for lists: ${cacheKey}`);
          return res.status(200).json(JSON.parse(cachedData));
        }
      } catch (err: any) {
        console.warn('⚠️ Cache fetch failed:', err.message);
      }
    }

    const assignments = await Assignment.find(query).sort({ createdAt: -1 });

    // Store in Redis with 60-seconds TTL
    if (isRedisAvailable()) {
      try {
        await redisConnection.setex(cacheKey, 60, JSON.stringify(assignments));
        console.log(`⚡ Cache MISS. Saved search list inside: ${cacheKey}`);
      } catch (err: any) {
        console.warn('⚠️ Cache save failed:', err.message);
      }
    }

    return res.status(200).json(assignments);
  } catch (error: any) {
    console.error('Error in getAssignments controller:', error);
    return res.status(500).json({ error: error.message || 'Internal server error' });
  }
};

// 3. Get Single Assignment by ID (with Redis caching)
export const getAssignmentById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const cacheKey = `cache:assignment:${id}`;

    // Check Redis cache if online
    if (isRedisAvailable()) {
      try {
        const cachedData = await redisConnection.get(cacheKey);
        if (cachedData) {
          console.log(`⚡ Cache HIT for details: ${cacheKey}`);
          return res.status(200).json(JSON.parse(cachedData));
        }
      } catch (err: any) {
        console.warn('⚠️ Cache detail fetch failed:', err.message);
      }
    }

    const assignment = await Assignment.findById(id);

    if (!assignment) {
      return res.status(404).json({ error: 'Assignment not found.' });
    }

    // Cache details with 120-seconds TTL
    if (isRedisAvailable()) {
      try {
        await redisConnection.setex(cacheKey, 120, JSON.stringify(assignment));
        console.log(`⚡ Cache MISS. Saved assignment record inside: ${cacheKey}`);
      } catch (err: any) {
        console.warn('⚠️ Cache detail save failed:', err.message);
      }
    }

    return res.status(200).json(assignment);
  } catch (error: any) {
    console.error('Error in getAssignmentById controller:', error);
    return res.status(500).json({ error: error.message || 'Internal server error' });
  }
};

// 4. Delete Assignment by ID
export const deleteAssignment = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const assignment = await Assignment.findByIdAndDelete(id);

    if (!assignment) {
      return res.status(404).json({ error: 'Assignment not found.' });
    }

    // Invalidate Redis Caches
    await invalidateCache(id);

    return res.status(200).json({ message: 'Assignment deleted successfully.' });
  } catch (error: any) {
    console.error('Error in deleteAssignment controller:', error);
    return res.status(500).json({ error: error.message || 'Internal server error' });
  }
};

// 5. Regenerate Assignment
export const regenerateAssignment = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { questionConfigs } = req.body;

    const assignment = await Assignment.findById(id);
    if (!assignment) {
      return res.status(404).json({ error: 'Assignment not found.' });
    }

    let parsedConfigs = questionConfigs;
    if (!parsedConfigs) {
      const mcqQuestions = assignment.questions.filter((q) => q.type === 'mcq');
      const shortQuestions = assignment.questions.filter((q) => q.type === 'short');
      
      parsedConfigs = [
        {
          type: 'mcq',
          count: mcqQuestions.length || 4,
          marks: mcqQuestions[0]?.marks || 1
        },
        {
          type: 'short',
          count: shortQuestions.length || 3,
          marks: shortQuestions[0]?.marks || 2
        }
      ];
    }

    assignment.status = 'pending';
    assignment.error = undefined;
    await assignment.save();

    // Invalidate cache since status changes
    await invalidateCache(id);

    const jobData = {
      assignmentId: assignment._id.toString(),
      title: assignment.title,
      subject: assignment.subject,
      classLevel: assignment.classLevel,
      schoolName: assignment.schoolName,
      questionConfigs: parsedConfigs,
      imagePath: assignment.imageUrl ? `./public${assignment.imageUrl}` : undefined
    };

    if (isRedisAvailable() && assignmentQueue) {
      await assignmentQueue.add(`generate-${assignment._id}`, jobData, {
        attempts: 2,
        backoff: 5000
      });
    } else {
      process.nextTick(async () => {
        try {
          await processAssignmentJob({ data: jobData } as any);
        } catch (err) {
          console.error('Error running direct generation job:', err);
        }
      });
    }

    return res.status(200).json(assignment);
  } catch (error: any) {
    console.error('Error in regenerateAssignment controller:', error);
    return res.status(500).json({ error: error.message || 'Internal server error' });
  }
};
