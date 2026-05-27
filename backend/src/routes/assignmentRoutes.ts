import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import {
  createAssignment,
  getAssignments,
  getAssignmentById,
  deleteAssignment,
  regenerateAssignment
} from '../controllers/assignmentController';

const router = Router();

// Configure Multer for File Uploads
const uploadDir = path.join(__dirname, '../../public/uploads');

// Create upload directory if it does not exist
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const fileFilter = (req: any, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  const allowedTypes = /jpeg|jpg|png/;
  const ext = allowedTypes.test(path.extname(file.originalname).toLowerCase());
  const mime = allowedTypes.test(file.mimetype);

  if (ext && mime) {
    cb(null, true);
  } else {
    cb(new Error('Only image files (JPEG, JPG, PNG) are allowed!'));
  }
};

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter
});

// Assignment REST Endpoints
router.post('/', upload.single('document'), createAssignment);
router.get('/', getAssignments);
router.get('/:id', getAssignmentById);
router.delete('/:id', deleteAssignment);
router.post('/:id/regenerate', regenerateAssignment);

export default router;
