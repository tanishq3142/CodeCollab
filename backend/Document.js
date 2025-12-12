import mongoose from 'mongoose';

const documentSchema = new mongoose.Schema({
    _id: String,
    content: String,
    name: String
});

export default mongoose.model('Document', documentSchema);
