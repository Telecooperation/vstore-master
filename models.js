var mongoose = require("mongoose");

var Schema = mongoose.Schema;

//Define all the mongoose models for context types
var NodeInfoSchema = Schema(
{
    uuid: String,
    url: String,
    port: Number,
    type: String,
    location: {
        type: [Number], // [<longitude>, <latitude>]
        index: '2dsphere' // create the 2d geospatial index
    },
    bandwidthDown: Number,
    bandwidthUp: Number,
    latency: Number
});

var models = {
    NodeInfo : mongoose.model('NodeInfo', NodeInfoSchema),
};

module.exports = {
    NodeInfo: models.NodeInfo
}
