import os
import json 
import requests
import sys
import time
import os.path
from os import path

LOGFILE = 'startUpLofFile.log';
encoding = 'utf-8'
claudConfigfilepath = '/config.txt'

def getMetaData():
    resposneDict = {}
    resp = requests.get('http://169.254.169.254/metadata/v1/interfaces/public/0/ipv4/address')
    resposneDict['ipAddr'] = str(resp.content, encoding);
    resp = requests.get('http://169.254.169.254/metadata/v1/hostname')
    resposneDict['hostName'] = str(resp.content, encoding);
    print(resposneDict, file=sys.stderr)
    return resposneDict;

def readCloudConfigData():
    cloudConfigDict = {} 
    with open(claudConfigfilepath) as fp:
       line = fp.readline()
       while line:
           line = line.strip()
           print(line, file=sys.stderr)
           listData = line.split(":")
           if('PARAM2' == listData[0]):
              cloudConfigDict[listData[0]] = listData[1]+":"+listData[2];
           else:   
              cloudConfigDict[listData[0]] = listData[1]
           line = fp.readline()
           
    print(cloudConfigDict, file=sys.stderr)
    return cloudConfigDict; 

def changeS3UplaodScript(cloudConfigDict):
    FilePath =  '/usr/local/bigbluebutton/core/scripts/post_publish/bbb_s3_upload.py'
    if (path.exists(FilePath)):
        collageID = cloudConfigDict.get("PARAM1");
        ApiURL = cloudConfigDict.get("PARAM3");
        ApiKey = cloudConfigDict.get("PARAM4");
        s3Key = cloudConfigDict.get("PARAM5");
        s3Secret = cloudConfigDict.get("PARAM6");
        
        if collageID != 'None':
            tokenString = 'querystring = {"collegeId":"<Somecollage>"}'
            tokenString = tokenString.replace("<Somecollage>", collageID)
            cmd =  "sed -i '/querystring = {/c "+ tokenString+"' "+FilePath
            print(cmd, file=sys.stderr)
            os.system(cmd)
            
        if ApiURL != 'None':
            tokenString = 'URL = "<APIURL>";'
            tokenString = tokenString.replace("<APIURL>", ApiURL)
            cmd =  "sed -i '/URL = /c "+ tokenString+"' "+FilePath
            print(cmd, file=sys.stderr)
            os.system(cmd) 
            
        if ApiKey != 'None':
            tokenString = '"x-api-key": "<APIKEY>"'
            tokenString = tokenString.replace("<APIKEY>", ApiKey)
            cmd =  "sed -i '/x-api-key/c "+ tokenString+"' "+FilePath
            print(cmd, file=sys.stderr)
            os.system(cmd) 
            
        if s3Key != 'None':
            tokenString = 'os.environ["AWS_ACCESS_KEY_ID"] = "<S3KEY>";'
            tokenString = tokenString.replace("<S3KEY>", s3Key)
            cmd =  "sed -i '/AWS_ACCESS_KEY_ID/c "+ tokenString+"' "+FilePath
            print(cmd, file=sys.stderr)
            os.system(cmd)              
               
        if s3Secret != 'None':
            tokenString = 'os.environ["AWS_SECRET_ACCESS_KEY"] = "<S3SECRET>";'
            tokenString = tokenString.replace("<S3SECRET>", s3Secret)
            cmd =  "sed -i '/AWS_SECRET_ACCESS_KEY/c "+ tokenString+"' "+FilePath
            print(cmd, file=sys.stderr)
            os.system(cmd)     
                  
    else:
        print("this file " + FilePath + " doesn't Exist" , file=sys.stderr ) 

def chnageDNSName(cloudConfigDict,ipAddr):
     try:        
            reQheaders = {}
            reQheaders['content-type'] = "application/json";
            
            apiAuth  = cloudConfigDict.get("PARAM2")
            domainName = cloudConfigDict.get("PARAM7");
            
            reqObj = {}
            reqObj['data']=ipAddr;
            reqObj['ttl']=1800;
            reqBody =[reqObj];
            
            if apiAuth != 'None' and domainName != 'None':
                 reQheaders['Authorization'] = apiAuth 
                 listData = domainName.split(".")
                 domain = listData[1]+"."+listData[2]
                 URL  =  'https://api.godaddy.com/v1/domains/'+domain+'/records/A/'+listData[0] 
                 print("URL = " + URL, file=sys.stderr)
                 print("reqBody = " + json.dumps(reqBody), file=sys.stderr)
                 print(reQheaders, file=sys.stderr)
                 resp = requests.request("PUT", URL, data=json.dumps(reqBody), headers=reQheaders)
                 print(resp.status_code, file=sys.stderr) 
                 site_response = str(resp.content)
                 print(site_response,file=sys.stderr)
                 if resp.status_code == 200:
                    print(" API call Sucess -- DNS Entry for " + domainName + " Has been Completed Suecssfully", file=sys.stderr)
                    return True;
                 else:
                    print("API call for  DNS Change   for " + domainName + " Has been Failled " , file=sys.stderr) 
                    return False;
            else:
                 print(" apiAuth and  domainName found null . can't procced with DNS change " , file=sys.stderr) 
                 return False; 
                    
     except Exception as e:
        print("Error in chnageDNSName:" + + str(e) , file=sys.stderr )
        return False;      

def changeFilesData(ipAddr , host ):  
    cmd1 = "sed -i 's/167.71.239.31/" +ipAddr+"/g' /usr/share/red5/webapps/sip/WEB-INF/bigbluebutton-sip.properties"
    cmd2 = "sed -i 's/167.71.239.31/" +ipAddr+"/g' /etc/bigbluebutton/nginx/sip.nginx"
    cmd3 = "sed -i 's/167.71.239.31/" +ipAddr+"/g' /opt/freeswitch/etc/freeswitch/vars.xml"
    cmd4 = "sed -i 's/167.71.239.31/" +ipAddr+"/g' /usr/share/bbb-web/WEB-INF/classes/bigbluebutton.properties"
    cmd5 = "sed -i 's/167.71.239.31/" +ipAddr+"/g' /usr/local/bigbluebutton/bbb-webrtc-sfu/config/default.yml"
    cmd6 = "sed -i 's/167.71.239.31/" +ipAddr+"/g' /opt/freeswitch/etc/freeswitch/sip_profiles/external.xml"
    cmd7 = "sed -i 's/poc1.medwhiz.in/" +host+"/g' /greenlight/.env"
    
    print(cmd1, file=sys.stderr)
    os.system(cmd1)
    
    print(cmd2, file=sys.stderr)
    os.system(cmd2)
    
    print(cmd3, file=sys.stderr)
    os.system(cmd3)
    
    print(cmd4, file=sys.stderr)
    os.system(cmd4)
    
    print(cmd5, file=sys.stderr)
    os.system(cmd5)
    
    print(cmd6, file=sys.stderr)
    os.system(cmd6)
    
    print(cmd7, file=sys.stderr)
    os.system(cmd7)
    
    cmd8 = "sed -i 's/poc1.medwhiz.in/" +host+"/g' /etc/nginx/sites-available/bigbluebutton"
    print(cmd8, file=sys.stderr)
    os.system(cmd8)
    
    #cmd9 = "rm -r /etc/letsencrypt/archive/*"
    #print(cmd9, file=sys.stderr)
    #os.system(cmd9)

def setupBBB(host):
    cmd1 = "bbb-conf  --setip "+host
    cmd3 ="bbb-conf  --clean"  
    
    cmd4 ="bbb-record --deleteall"  
    cmd5 ="/greenlight"  
    cmd6 ="docker-compose up -d"
    
    print(cmd1, file=sys.stderr)
    os.system(cmd1) 
    
    #cmd2 = "certbot --webroot -w /var/www/bigbluebutton-default/ -d "+host+" certonly"
    #print(cmd2, file=sys.stderr)
    #os.system(cmd2) 
    
    print(cmd3, file=sys.stderr)
    os.system(cmd3) 
    
    print(cmd4, file=sys.stderr)
    os.system(cmd4) 
    
    print(cmd5, file=sys.stderr)
    #os.system(cmd5) 
    os.chdir(cmd5)
    
    print(cmd6, file=sys.stderr)
    os.system(cmd6)      
        
def main():
    sys.stderr = open(LOGFILE, 'a')
    print("\n<-------------------" + time.strftime("%c") + "----------------------->\n", file=sys.stderr); 
    resposneDict = getMetaData();
    cloudConfigDict = readCloudConfigData()
    ipAddr  =  resposneDict.get("ipAddr");
    hostName  =  resposneDict.get("hostName");
    
    domainName = cloudConfigDict.get("PARAM7");
    result  = chnageDNSName(cloudConfigDict,ipAddr)
    
    if(result):   
        if ipAddr != 'None' and domainName != 'None':
           changeFilesData(ipAddr,domainName);
           changeS3UplaodScript(cloudConfigDict);
           setupBBB(domainName); 
        else:
             print(" ipAddr and  domainName found null . can't procced  with DNS change " , file=sys.stderr) 
    else:
        print("IP Switch for Domain = "  + hostName + "  has Failed  hence skipped other configuration", file=sys.stderr) 
        #we should be callin API  to let evreyone know that droplet is configured sucesffuly  
        
        
if __name__ == "__main__":
    main() 