import mongoose from 'mongoose';

const SettingsSchema = new mongoose.Schema(
  {
    _id: { type: String, default: 'singleton' },
    instituteName: { type: String, default: 'EduFee' },
    academicSession: { type: String, default: '2026-2027' },
    class11MonthlyFee: { type: Number, default: 4000 },
    class12MonthlyFee: { type: Number, default: 5000 },
  },
  {
    timestamps: true,
    collection: 'settings',
    versionKey: false,
    toJSON: {
      transform(_doc, ret) {
        ret.id = ret._id;
        delete ret._id;
        return ret;
      }
    }
  }
);

export const Settings = mongoose.model('Settings', SettingsSchema);