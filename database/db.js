const mongoose = require("mongoose");

const connectDatabase  = async () => {
    try {
        const result = await mongoose.connect(process.env.MONGO_URI);
        console.log(`MongoDB Connected: ${result.connection.host}`);
    } catch (error) {
        console.log(`Error: ${error.message}`);
    }
}

module.exports = connectDatabase;