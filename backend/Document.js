import mongoose from 'mongoose';

const documentSchema = new mongoose.Schema({
    _id: String,
    files: [{
        name: String,
        content: String,
        language: String
    }],
    users: [{ type: String }], // Active users (optional persistence)
    owner: String,
    name: String
});

export default mongoose.model('Document', documentSchema);
