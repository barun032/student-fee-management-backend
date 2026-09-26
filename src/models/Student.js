import mongoose from 'mongoose';

const StudentSchema = new mongoose.Schema(
  {
    _id: { type: String, required: true },            // "STU001"
    name: { type: String, required: true, trim: true, index: true },
    mobile: { type: String, required: true, index: true },
    gender: { type: String, required: true, enum: ['Male', 'Female', 'Other'] },
    cls: { type: String, required: true, enum: ['Class 11', 'Class 12'], index: true },
    monthlyFee: { type: Number, required: true, min: 1 },
    startMonth: { type: String, required: true },     // "YYYY-MM"
    address: { type: String, required: true, trim: true },
    guardianName: { type: String, default: null, trim: true },
    guardianMobile: { type: String, default: null },
    admissionDate: { type: Date, required: true },
    notes: { type: String, default: null },
  },
  {
    timestamps: true,
    collection: 'students',
    versionKey: false,
    toJSON: {
      transform(_doc, ret) {
        ret.id = ret._id;
        delete ret._id;
        return ret;
      }
    },
    toObject: {
      transform(_doc, ret) {
        ret.id = ret._id;
        delete ret._id;
        return ret;
      }
    }
  }
);

StudentSchema.index({ name: 'text', mobile: 'text' });

export const Student = mongoose.model('Student', StudentSchema);