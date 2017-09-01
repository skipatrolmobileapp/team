# Ski Patrol Mobile App

Copyright © 2014-2017, Gary Meyer.
All rights reserved.

Note: This is the final commit before the DreamFactory 2.8.1 upgrade.

## DreamFactory Upgrade Checklist

* Copyright statement.
* Search "skipatrolmobileapp"
* Logging app id
* Search "rhcloud"
* https://api-skipatrol.rhcloud.com:443/rest -> https://api.medic52team.com/api/v2/
* db/ -> team/_table or logging/_table for AccessLog
* New api_key = 510cb035f3ac4548fb4e75c94f40d616a67c8288faea9cd383ee219b413afdb0
* xhr.setRequestHeader("X-DreamFactory-Application-Name", "skipatrolmobileapp") ->
    xhr.setRequestHeader("X-DreamFactory-API-Key", "510cb035f3ac4548fb4e75c94f40d616a67c8288faea9cd383ee219b413afdb0");
* .record -> .resource
* Wrapper POSTs with {"resource": [ HERE ]};

