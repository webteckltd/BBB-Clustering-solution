const Logger = require("./logger.js");
const axios = require("axios");
const coreModule = require("./clusteringCoreModule.js");
const crypto = require("crypto");

appModels = require('./appModels');
var clusterModel = appModels.cluster;


exports.executeTask = async function (requestTemplate, actionTaken) {
    function BBBCluster() {
        return clusterModel
            .find()
            .exec();
    }
    try {
        let header = {}
        header['Authorization'] = process.env.DIGITAL_OCEAN_AUTH;
        header['Content-Type'] = 'application/json';
        let options = {
            headers: header
        };
        let dropletsMap = new Map();
        let cluster = await BBBCluster();

        try {
            let APIURL = process.env.DIGITAL_OCEAN_API
            APIURL = APIURL + "?page=1&per_page=196&tag_name=" + process.env.TAGS
            //APIURL = APIURL + "?page=1&per_page=196&tag_name=bbb";
            Logger.info(" calling DigitalOcean Service " + APIURL);
            const response = await axios.get(APIURL, options);
            if (response.status === 200) {
                console.log(JSON.stringify(response.data));
                dataResp = response.data
                dropletsList = dataResp.droplets
                dropletsList.forEach(droplet => {
                    let dropletName = droplet.name;
                    Logger.info("Execute Task - dropletName = " + dropletName);
                    dropletsMap.set(dropletName, droplet)
                });
            } else {
                console.log("Error while Loading List of  Clustering  enabled droplets");
            }

        } catch (error) {
            Logger.info(" Error while Loading List of  Clustering enabled droplets" + error.message);
        }

        cluster.forEach(node => {
            let domainName = node.domainName;
            if (null !== domainName && typeof domainName !== 'undefined' && domainName.length > 0) {
                Logger.info("domainName = " + domainName);
                let droplet = dropletsMap.get(domainName);
                if (actionTaken === 'START') {
                    if (typeof droplet === 'undefined') {
                        Logger.info("Droplet with Domain Name = " + domainName + " Does't Exist .. Going to Creating one ");
                        coreModule.createNstartDomainDroplet(domainName, node, requestTemplate, options,actionTaken);
                    }
                    else if (typeof droplet !== 'undefined' && droplet.status !== 'active' && droplet.status !== 'new') {
                        Logger.info("domainName = " + domainName + "  droplet Status  = " + droplet.status);
                        coreModule.createAuditRecords(domainName, " Droplet already Exist but its  not in Active/New  State .. we should destroy and recreate", "START", "SKIPPED")
                        //TODO  Droplet is not Active/New , we should destry Droplet and Create new on hear .
                        coreModule.destroyNCreate(domainName, node, requestTemplate, options, droplet,actionTaken);
                    } else {
                        Logger.info("domainName = " + domainName + "  droplet Status  = " + droplet.status);
                        coreModule.createAuditRecords(domainName, " Droplet already Exist and its in  Active/New State ", "START", "FAILED")
                        //TODO  Droplet is Either Active /New  .. we shouldn't we doing anything here .
                    }

                } else if (actionTaken === 'DESTROY') {
                    if (typeof droplet === 'undefined') {
                        Logger.info("Droplet with Domain Name = " + domainName + " Does't Exist .. Going to Skip Destroy Task ");
                        coreModule.createAuditRecords(domainName, " Droplet Does't Exist  Going to Skip Destroy Task ", "DESTROY", "SKIPPED")
                    }
                    else if (typeof droplet !== 'undefined' && droplet.status !== 'active' && droplet.status !== 'new') {
                        Logger.info("domainName = " + domainName + "  droplet Status  = " + droplet.status);
                        coreModule.destroyNCreate(domainName, node, requestTemplate, options, droplet,actionTaken);
                    } else {
                        Logger.info("domainName = " + domainName + "  droplet Status  = " + droplet.status);
                        //Check if meeting is already running on this domain  .. if no meeting Running then destroy it after 10 min 
                        let secret = node.domainSecret;
                        let bbbUrl = node.bbbAccountDomain;
                        let checkSumRAW = "getMeetings" + secret;
                        let checkSUM = crypto.createHash("sha1").update(checkSumRAW, "binary").digest("hex");
                        let urlQueryString = "checksum=" + checkSUM;
                        let meetingUrl = bbbUrl + "api/getMeetings?" + urlQueryString;
                        coreModule.checkNDestroy(domainName, node, requestTemplate, options, droplet,actionTaken,meetingUrl);
                    }

                } else {
                    Logger.info(" Wrong Action code was provided  = " + actionTaken);
                }
            }
        });

        setTimeout(coreModule.validateCluster, 30000, options,actionTaken) // later chnage it to 15 Minute - 900000

    } catch (error) {
        Logger.info("Error happen on  ExecuteTask - " + error.message);
    }

}