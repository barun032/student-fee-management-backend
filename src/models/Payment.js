import mongoose from 'mongoose';

const PaymentSchema = new mongoose.Schema(
  {
    _id: { type: String, required: true },            // "PAY001"
    studentId: { type: String, required: true, index: true, ref: 'Student' },
    amount: { type: Number, required: true, min: 1 },
    paymentDate: { type: Date, required: true, index: true },
    forMonth: { type: String, default: null, index: true },  // "YYYY-MM" or null
    method: {
      type: String,
      required: true,
      enum: ['UPI', 'Cash', 'Bank Transfer', 'Other']
    },
    notes: { type: String, default: null },
  },
  {
    timestamps: true,
    collection: 'payments',
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

PaymentSchema.index({ studentId: 1, paymentDate: -1 });

export const Payment = mongoose.model('Payment', PaymentSchema);