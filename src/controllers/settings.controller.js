import { Settings } from '../models/Settings.js';
import { asyncHandler } from '../utils/asyncHandler.js';

const getOrCreate = async () => {
  let doc = await Settings.findById('singleton');
  if (!doc) doc = await Settings.create({ _id: 'singleton' });
  return doc;
};

export const get = asyncHandler(async (_req, res) => {
  const settings = await getOrCreate();
  res.json({ success: true, data: { ...settings.toObject(), id: 'singleton' } });
});

export const update = asyncHandler(async (req, res) => {
  await getOrCreate();
  const settings = await Settings.findByIdAndUpdate('singleton', req.body, { new: true });
  res.json({ success: true, data: { ...settings.toObject(), id: 'singleton' } });
});