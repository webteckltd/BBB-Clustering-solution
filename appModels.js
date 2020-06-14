var mongoose = require('mongoose');

var clusterAuditSchema = mongoose.Schema({
    "domainName": {type: String, required:true}
    ,"actionTaken":String
    ,"timestamp": { type : Date, default: Date.now }
    ,"actionResult":String
    ,"message":String
});


var clusterSchema = mongoose.Schema(
    {
        "bbbAccountDomain": {type: String, required:true}
        , "domainSecret": {type: String, required:true}
        , "currentMeetingCount": {type: Number, default:0}
        , "currentUserCount": {type: Number, default:0}
        , "domainName": {type: String, required:true}
        , "availability": {
            type: String,
            enum: ['UP', 'DOWN'],
            default: 'UP'
        }
        , "clusteringEnabled": {
            type: String,
            enum: ['TRUE', 'FALSE'],
            default: 'FALSE'
        }
    }
);

exports.audit = mongoose.model('bbb_clustering_audit', clusterAuditSchema);
exports.cluster = mongoose.model('bbb_clusters', clusterSchema);