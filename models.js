var mongoose = require("mongoose");

var Schema = mongoose.Schema;

//Define all the mongoose models for context types
var NodeInfoSchema = Schema(
{
    uuid: String,
    url: String,
    port: Number,
    node_type: String,
    loc: {
        type: [Number], // [<longitude>, <latitude>]
        index: '2dsphere' // create the 2d geospatial index
    },
    upstream_speed: Number,
    downstream_speed: Number,
    latency: Number
});

var models = {
    NodeInfo : mongoose.model('NodeInfo', NodeInfoSchema),
};

module.exports = {
    NodeInfo: models.NodeInfo
}
