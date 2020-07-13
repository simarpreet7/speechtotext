var mongoose = require("mongoose");


var meetingschema = new mongoose.Schema({
    name:String,
    creator:String,
    date: { type: Date, default: Date.now },
    joiner: [String],
});


module.exports = mongoose.model("meeting",meetingschema);

