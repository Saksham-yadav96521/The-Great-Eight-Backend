import mongoose from "mongoose";

const infoItemSchema = new mongoose.Schema({
  category: {
    type: String,
    required: true,
    enum: [
      'Brief History', 'Glimpses / Archives', 'Regt History', 'Upcoming Events',
      'Tigers', 'Roll of Offrs', 'SMs', 'Roll of JCOs / OR', 'Imp Info',
      'Silver Gunner', 'LGSC Qualified', 'ACC / SCO', 'Accolades', 'Distinguished',
      'Birthday', 'Marriage Anniversary'
    ]
  },
  title: {
    type: String,
    required: true
  },
  description: {
    type: String
  },
  order: {
    type: Number,
    default: 0
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

export default mongoose.model("InfoItem", infoItemSchema);
