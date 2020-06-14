const Logger = require("./logger.js");
const axios = require("axios");
const convert = require('xml-js');

appModels = require('./appModels');
var auditModel = appModels.audit;

/**
 * This method will check if provided Domain is enabled for clustering 
 * if its Enabled then it will create request object (JSON) using pre-Defined Template and configured data 
 * and call Digital Ocean API to create new Droplet
 * @param {*} domainName 
 * @param {*} clusterNode 
 * @param {*} requestTemplate 
 * @param {*} options 
 * @param {*} actionTaken 
 */
const createNstartDomainDroplet = async (domainName, clusterNode, requestTemplate, options, actionTaken) => {
    let isEnabled = clusterNode.clusteringEnabled;
    if (null !== isEnabled && typeof isEnabled !== 'undefined' && isEnabled === 'TRUE') {
        try {
            Logger.info("createNstartDomainDroplet --started  for DomainName = " + domainName);
            requestTemplate = requestTemplate.replace("<HOSTNAME>", domainName);
            requestTemplate = requestTemplate.replace("<REGION>", process.env.REGION);
            requestTemplate = requestTemplate.replace("<SIZE>", process.env.SIZE);
            requestTemplate = requestTemplate.replace("<IMAGE_ID>", process.env.IMAGE_ID);
            requestTemplate = requestTemplate.replace("<SSH_KEYS>", process.env.SSH_KEYS);
            requestTemplate = requestTemplate.replace("<TAGS>", process.env.TAGS);
            requestTemplate = requestTemplate.replace("<PYTHON_SCRIPT_URL>", process.env.PYTHON_SCRIPT_URL);

            requestTemplate = requestTemplate.replace("<PARAM1>", clusterNode.collageID);
            requestTemplate = requestTemplate.replace("<PARAM2>", process.env.API_AUTH);
            requestTemplate = requestTemplate.replace("<PARAM3>", process.env.BBB_METEING_URL);
            requestTemplate = requestTemplate.replace("<PARAM4>", process.env.X_API_KEY);
            requestTemplate = requestTemplate.replace("<PARAM5>", process.env.AWS_ACCESS_KEY);
            requestTemplate = requestTemplate.replace("<PARAM6>", process.env.AWS_ACCESS_SECRET);
            requestTemplate = requestTemplate.replace("<PARAM7>", domainName);
            //Logger.info("createNstartDomainDroplet -- RequestObject = " + requestTemplate);
            console.log("createNstartDomainDroplet -- RequestObject = " + requestTemplate);
            //Logger.info("createNstartDomainDroplet -- options = " + JSON.stringify(options));

            Logger.info("createNstartDomainDroplet -- Calling  = " + process.env.DIGITAL_OCEAN_API);
            try {
                const response = await axios.post(process.env.DIGITAL_OCEAN_API, requestTemplate, options);
                if (response.status === 202) {
                    createAuditRecords(domainName, " Droplet Created Sucessully", actionTaken, "SUCCESS")
                    Logger.info(JSON.stringify(response.data));
                } else {
                    createAuditRecords(domainName, " Droplet Creation  Failed ", actionTaken, "FAILED")
                    Logger.info("Create Droplet Request Failed for Domnain = " + domainName);
                }
            } catch (error) {
                createAuditRecords(domainName, " Droplet Creation  Failed " + error.message, actionTaken, "FAILED")
                Logger.info("Create Droplet Request Failed for Domnain = " + domainName + error.message);
            }
        } catch (error) {
            createAuditRecords(domainName, " Droplet Creation  Failed " + error.message, actionTaken, "FAILED")
            Logger.info("Create Droplet Request Failed for Domnain = " + domainName + error.message);
        }
    }
}

/**
 * This method will check if there is any meeting going on for providedd domain 
 * if there is no meeting then destroy droplet 
 * and if there is meeting going on then schedule it to check again after 15 min .
 * @param {*} domainName 
 * @param {*} clusterNode 
 * @param {*} requestTemplate 
 * @param {*} options 
 * @param {*} dropLetObj 
 * @param {*} actionTaken 
 * @param {*} bbbUrl 
 */
const checkNDestroy = async (domainName, clusterNode, requestTemplate, options, dropLetObj, actionTaken, bbbUrl) => {
    try {
        let response = await axios.get(bbbUrl);
        let respData = " " + response.data;
        Logger.info("checkNDestroy --BBB getMeetingsResponse -- respData = " + respData);
        if (respData.includes('SUCCESS')) {
            let jsonResponse = JSON.parse(convert.xml2json(response.data, { compact: true }));
            let meetingsArray = jsonResponse.response.meetings.meeting;
            if (null !== meetingsArray && typeof meetingsArray !== 'undefined' && meetingsArray.length > 0) {
                ///Meeting is going on  - reshuled this check N Delete for next 15 min 
                Logger.info("Meeting is going on checkNDestroy is reshuled  for next 15 min for Domnain = " + domainName );
                setTimeout(checkNDestroy, 900000, domainName, clusterNode, requestTemplate, options, dropLetObj, actionTaken, bbbUrl) // 15 Minute - 900000
            }else{
                Logger.info("No Meeting is Happening   - safe to Destroy this node  for Domnain = " + domainName );
                /// No Meeting is Happening   - safe to Destroy this node 
                destroyNCreate(domainName, clusterNode, requestTemplate, options, dropLetObj, actionTaken);
            }
        } else {
           ///  API called failed may be authentication didn't happen properly  -- Need to check when this scenario  will happen  
        }
    } catch (error) {
        createAuditRecords(domainName, " Check and Destroy Droplet Request Failed  " + error.message, actionTaken, "FAILED")
        Logger.info("Check and Destroy Droplet Request Failed for Domnain = " + domainName + error.message);
    }
}

/**
 * This method will check if provided Domain is enabled for clustering 
 * and if its enabled,  then it  will  call Digital Ocean API to destroy Droplet for that domain .
 * IF actionTaken ='START' then it will try to create new droplet for provided domain name . 
 * @param {*} domainName 
 * @param {*} clusterNode 
 * @param {*} requestTemplate 
 * @param {*} options 
 * @param {*} dropLetObj 
 * @param {*} actionTaken 
 */

const destroyNCreate = async (domainName, clusterNode, requestTemplate, options, dropLetObj, actionTaken) => {
    //curl -X DELETE -H "Content-Type: application/json" -H "Authorization: Bearer b7d03a6947b217efb6f3ec3bd3504582" "https://api.digitalocean.com/v2/droplets/3164494" 
    let isEnabled = clusterNode.clusteringEnabled;
    if (null !== isEnabled && typeof isEnabled !== 'undefined' && isEnabled === 'TRUE') {
        try {
            let dropletID = dropLetObj.id
            let APIURL = process.env.DIGITAL_OCEAN_API
            APIURL = APIURL + "/" + dropletID
            const response = await axios.delete(APIURL, options);
            if (response.status === 204) {
                Logger.info("Droplet Deleted  Sucessully for Domnain = " + domainName);
                createAuditRecords(domainName, " Previous stopped/archived Droplet Deleted  Sucessully", actionTaken, "SUCCESS")
                if (actionTaken === 'START')
                    createNstartDomainDroplet(domainName, clusterNode, requestTemplate, options, actionTaken);
            } else {
                createAuditRecords(domainName, " Destroy Droplet Request Failed ", actionTaken, "FAILED")
                Logger.info("Destroy Droplet Request Failed for Domnain = " + domainName);
            }

        } catch (error) {
            createAuditRecords(domainName, " Destroy Droplet Request Failed " + error.message, actionTaken, "FAILED")
            Logger.info("Destroy Droplet Request Failed for Domnain = " + domainName + error.message);
        }
    }
}

/**
 * This method with call Digital Ocean API to fetch all Existing Droplets for configured Tag 
 * and then validate  their State and accordingly create Audit reciord for each domnain/droplet
 * @param {*} options 
 * @param {*} actionTaken 
 */

const validateCluster = async (options, actionTaken) => {
    try {
        let APIURL = process.env.DIGITAL_OCEAN_API
        APIURL = APIURL + "?tag_name=" + process.env.TAGS
        // APIURL = APIURL + "?page=1&per_page=196&tag_name=bbb";
        Logger.info(" calling DigitalOcean Service " + APIURL);
        const response = await axios.get(APIURL, options);
        if (response.status === 200) {
            console.log(JSON.stringify(response.data));
            dataResp = response.data
            dropletsList = dataResp.droplets
            dropletsList.forEach(droplet => {
                let dropletName = droplet.name;
                Logger.info("validateCluster - dropletName = " + dropletName);
                if (droplet.status === 'active' || droplet.status === 'new') {
                    Logger.info("domainName = " + dropletName + "  droplet Status  = " + droplet.status);
                    createAuditRecords(dropletName, "Droplet Current State " + droplet.status, actionTaken, "SUCCESS")
                } else {
                    Logger.info("domainName = " + dropletName + "  droplet Status  = " + droplet.status);
                    createAuditRecords(dropletName, "Droplet Current State " + droplet.status, actionTaken, "FAILED")
                }
            });
        } else {
            //TODO Error Handling 
            console.log("validateCluster - Request to Fetch List of Droplets failed  ");
        }

    } catch (error) {
        Logger.info("validateCluster - Exception happened while Fetching Fetch List of Droplets  " + error.message);
    }
}

/**
 * Method To Create Audit Record for Action Taken 
 * @param {*} domainName 
 * @param {*} message 
 * @param {*} actionTaken 
 * @param {*} actionResult 
 */

const createAuditRecords = async (domainName, message, actionTaken, actionResult) => {
    const auditObj = new auditModel();
    auditObj.domainName = domainName
    if (actionTaken !== '') {
        auditObj.actionTaken = domainName
    }

    if (message !== '') {
        auditObj.message = message
    }

    if (actionResult !== '') {
        auditObj.actionResult = actionResult
    }

    auditObj.save((saveErr) => {
        if (saveErr) {
            Logger.info("Audit Logging  for " + domainName + " Failled message  = " + message + " actionTaken = " + actionTaken);
            return;
        }
        Logger.info("Audit Record for " + domainName + " Logged  Sucessfully  message  = " + message + " actionTaken = " + actionTaken);
        return
    });
};

module.exports = {
    createAuditRecords, validateCluster, destroyNCreate, createNstartDomainDroplet,checkNDestroy
}