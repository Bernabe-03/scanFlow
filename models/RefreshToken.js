
import mongoose from 'mongoose';

// Define the schema for the Refresh Token
const refreshTokenSchema = new mongoose.Schema({
    token: {
        type: String,
        required: true,
        unique: true 
    },
    user: {
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'User', 
        required: true
    },
    createdAt: {
        type: Date,
        default: Date.now,
        expires: '7d' 
    }
});


const RefreshToken = mongoose.model('RefreshToken', refreshTokenSchema);

export default RefreshToken;
