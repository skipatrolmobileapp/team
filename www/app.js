/*jshint strict: true */
/*jshint unused: false */
/*jslint node: true */
/*jslint indent: 4 */
/*jslint unparam:true */
/*global console, setTimeout, device, onDeviceReady, window, navigator, localStorage, document, Date, ons, module, angular, spinnerModal, moment, settingLoggingAppId */
"use strict";

/*
Ski Patrol Mobile App
Copyright © 2014-2018, Gary Meyer.
All rights reserved.
*/

/*
Some globals. Not too many though.
*/
var IN_CORDOVA = false, // Indicator if in Cordova. Assume not.
    DSP_HOST = 'skipatrol.app', // Host name of the DreamFactory Service Platform (DSP) instance.
    DSP_PORT = '443', // Port of the DreamFactory Service Platform (DSP) instance.
    DSP_BASE_URL = 'https://' + DSP_HOST + ':' + DSP_PORT, // Base URL of the DreamFactory Service Platform (DSP) instance.
    DSP_API_KEY = '510cb035f3ac4548fb4e75c94f40d616a67c8288faea9cd383ee219b413afdb0', // DSP 2.x app identifier.
    havingPatience = false, // Indicates whether or not the user is waiting and watching the spinner.
    requestMap = {}; // A map of requests for knowing when the data was last requested so that periodic cache refreshes can be done.

/*
Let iOS status bar fully appear.
TODO: Perhaps there's a way to get the ons-toolbar to display smartly on the iPhone.
*/
ons.disableAutoStatusBarFill();


/*
Initialize Cordova.
*/
document.addEventListener("deviceready", onDeviceReady, false);

/*
Mind the gap, that is the PhoneGap. Or Cordova if you'd prefer.
*/
function onDeviceReady() {
    IN_CORDOVA = true;
    // StatusBar.hide();
}

/*
Initialize Onsen UI and ngTouch. Onsen UI is the UI library, Angular the primary JavaScript
framework, and the Angular touch plug-in for support of gestures, such as swipe.
*/
var module = ons.bootstrap('myApp', ['onsen', 'ngTouch']);

angular.module('myApp')
  .directive('myFocus', function () {
    return {
      restrict: 'A',
      link: function postLink(scope, element, attrs) {
        if ('' === attrs.myFocus) {
          attrs.myFocus = 'focusElement';
        }
        scope.$watch(attrs.myFocus, function(value) {
          if(value == attrs.id) {
            element[0].focus();
          }
        });
        element.on('blur', function() {
          scope[attrs.myFocus] = '';
          scope.$apply();
        });
      }
    };
  });


/*
Have patience and watch the spinner for a bit. Sorry buddy.
*/
function havePatience($rootScope) {
    if (!havingPatience) {
        havingPatience = true;
        $rootScope.spinnerUpdate = '';
        spinnerModal.show();
        setTimeout(function () {
            $rootScope.spinnerUpdate = 'Accessing server.';
        }, 3000);
        setTimeout(function () {
            $rootScope.spinnerUpdate = 'Accessing server...';
        }, 6000);
        setTimeout(function () {
            havingPatience = false;
            spinnerModal.hide();
        }, 9000);
    }
}

/*
Wait no more! Put the spinner away.
*/
function waitNoMore() {
    havingPatience = false;
    spinnerModal.hide();
}

/*
Log an event to the browser console.
*/
function browserLogEvent(level, event, $log) {
    switch (level) {
    case 'error':
        $log.error(event);
        break;
    case 'warn':
        $log.warn(event);
        break;
    case 'info':
        $log.info(event);
        break;
    case 'debug':
        $log.debug(event);
        break;
    default:
        $log.log(event);
    }
}

/*
Log data to the browser console.
*/
function browserLogData(level, data, $log) {
    var json = angular.toJson(data);
    if (data) {
        if (json) {
            switch (level) {
            case 'error':
                $log.error(json);
                break;
            case 'warn':
                $log.warn(json);
                break;
            case 'info':
                $log.info(json);
                break;
            case 'debug':
                $log.debug(json);
                break;
            default:
                $log.log(json);
            }
        } else {
            switch (level) {
            case 'error':
                $log.error(data);
                break;
            case 'warn':
                $log.warn(data);
                break;
            case 'info':
                $log.info(data);
                break;
            default:
                break;
            }
        }
    }
}

/*
Create a DSP request, cached by default with refreshes every 10 minutes for GETs.
TODO: Will be changing when upgrading to DSP 2.0.
*/
function dspRequest(httpMethod, urlPathAndParms, dataContent, refreshSeconds) {
    var email = localStorage.getItem('DspEmail'),
        password = localStorage.getItem('DspPassword'),
        aRequest = {
            'method': httpMethod,
            'cache': true,
            'timeout': 8000,
            'url': DSP_BASE_URL + '/api/v2' + urlPathAndParms,
            'headers': {
                'X-DreamFactory-API-Key': DSP_API_KEY
            },
            'data': dataContent
        },
        now = moment();
    if (email && password) {
        aRequest.headers.Authorization = 'Basic ' + btoa(email + ':' + password);
    }
    if ('GET' === httpMethod) {
        if (!requestMap[urlPathAndParms]) {
            aRequest.cache = false;
            requestMap[urlPathAndParms] = moment();
        } else {
            if (!refreshSeconds) {
                refreshSeconds = 600;
            }
            if (requestMap[urlPathAndParms].add(refreshSeconds, 'seconds') < now) {
                aRequest.cache = false;
                requestMap[urlPathAndParms] = moment();
            }
        }
    } else {
        aRequest.cache = false;
    }
    return aRequest;
}

/*
Send a log event to the server.
Note the 'app' attribute global set in the index.html to specify the app and its version.
*/
function serverLog(level, event, data, $http) {
    var accessLogData = {
            'user': localStorage.getItem('DspEmail'),
            'patrolPrefix': localStorage.getItem('DspPatrolPrefix'),
            'device': navigator.userAgent,
            'at': new Date(),
            'app': settingLoggingAppId,
            'event': event,
            'level': level,
            'json': angular.toJson(data)
        },
        postResource = {
            "resource": []
        };
    if (-1 === document.URL.indexOf('http://') && -1 === document.URL.indexOf('https://')) {
        if (IN_CORDOVA) {
            accessLogData.device = device.platform + '/' + device.version + '/' + device.model;
        } else {
            accessLogData.device = 'Native/unknown';
        }
    }
    postResource.resource.push(accessLogData);
    $http(dspRequest('POST', '/logging/_table/AccessLog', postResource)).
        success(function (data, status, headers, config) {
            return;
        }).
        error(function (data, status, headers, config) {
            return;
        });
}

/*
Logging service.
*/
module.service('AccessLogService', function ($http, $log) {
    this.log = function (level, event, data) {
        browserLogEvent(level, event, $log);
        browserLogData(level, data, $log);
        if ('error' === level || 'warn' === level || 'info' === level) {
            serverLog(level, event, data, $http);
        }
    };
});

function win(r) {
    console.log("Code = " + r.responseCode);
    console.log("Response = " + r.response);
    console.log("Sent = " + r.bytesSent);
    // alert(r.response);
}

function fail(error) {
    // alert("An error has occurred: Code = " + error.code);
}

/*
Text somebody's phone number.
*/
function sms(number) {
    var strippedNumber = number.replace(" ", "").replace("-", "").replace("(", "").replace(")", "");
    if (typeof device === 'undefined') {
        console.info('Sms: ' + number);
    } else {
        switch (device.platform) {
        case 'Android':
            navigator.app.loadUrl('sms:' + strippedNumber, {
                'openExternal': true
            });
            break;
        case 'iOS':
            window.open('sms:' + strippedNumber, '_system');
            break;
        default:
            window.open('sms:' + strippedNumber, '_system');
            break;
        }
    }
}

/*
Dial somebody's phone number.
*/
function dial(number) {
    var strippedNumber = number.replace(" ", "").replace("-", "").replace("(", "").replace(")", "");
    if (typeof device === 'undefined') {
        console.info('Dial: ' + number);
    } else {
        switch (device.platform) {
        case 'Android':
            navigator.app.loadUrl('tel:' + strippedNumber, {
                'openExternal': true
            });
            break;
        case 'iOS':
            window.open('tel:' + strippedNumber, '_system');
            break;
        default:
            window.open('tel:' + strippedNumber, '_system');
            break;
        }
    }
}

/*
Open in an in-app browser window.
*/
function browse(address) {
    if (typeof device === 'undefined') {
        window.open(address, '_blank', 'location=no, titlebar=yes, menubar=no, toolbar=no, status=no, scrollbars=yes');
    } else {
        switch (device.platform) {
        case 'Android':
            window.open(address, '_blank', 'location=no, titlebar=yes, menubar=no, toolbar=no, status=no, scrollbars=yes');
            // window.open(address, '_system');
            break;
        case 'iOS':
            window.open(address, '_blank', 'location=no, titlebar=yes, menubar=no, toolbar=no, status=no, scrollbars=yes');
            break;
        default:
            window.open(address, '_blank', 'location=no, titlebar=yes, menubar=no, toolbar=no, status=no, scrollbars=yes');
            break;
        }
    }
}

/*
Email somebody.
*/
function sendEmail(address, subject) {
    var url = 'mailto:' + address + '?subject=' + subject;
    if (typeof device === 'undefined') {
        window.open(url, '_system');
    } else {
        switch (device.platform) {
        case 'Android':
            navigator.app.loadUrl(url, {
                'openExternal': true
            });
            break;
        case 'iOS':
            window.open(url, '_system');
            break;
        default:
            window.open(url, '_system');
            break;
        }
    }
}

/*
Open URL in a external browser.
*/
function openInExternalBrowser(address) {
    if (typeof device === 'undefined') {
        window.open(address, '_system');
    } else {
        switch (device.platform) {
        case 'Android':
            navigator.app.loadUrl(address, {
                'openExternal': true
            });
            break;
        case 'iOS':
            window.open(address, '_system');
            break;
        default:
            window.open(address, '_system');
            break;
        }
    }
}

/*
Open a Youtube video.
*/
function youtube(address) {
    openInExternalBrowser(address);
}

/*
Open an ad.
*/
function openAd(address) {
    openInExternalBrowser(address);
}

/*
Make a nice and pretty message.
*/
function niceMessage(data, status) {
    var message = 'Server error';
    if (data) {
        if ((data.error) && (data.error) && (data.error.message)) {
            message = data.error.message;
        } else if (status) {
            switch (status) {
            case 400:
                message = 'Bad request.';
                break;
            case 401:
                message = 'Login failed.';
                break;
            case 404:
                message = 'Service not found.';
                break;
            case 500:
                message = 'Server is not available Try again later.';
                break;
            default:
                message = 'Status: ' + status;
            }
        } else {
            message = JSON.stringify(data);        
        }
    }
    return message;
}

/*
Convert string to Title Case.
See: http://stackoverflow.com/questions/196972/convert-string-to-title-case-with-javascript
*/
function toTitleCase(str) {
    return str.replace(/\w\S*/g, function(txt){return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();});
}

/*
Convert degrees bearing to such as "SW".
*/
function writeOutBearing(bearing) {
    var retValue;
    if (bearing < 11.25) {
        retValue = 'north';
    } else if (bearing < 33.75) {
        retValue = 'north-northeast';
    } else if (bearing < 56.25) {
        retValue = 'northeast';
    } else if (bearing < 78.75) {
        retValue = 'east-northeast';
    } else if (bearing < 101.25) {
        retValue = 'east';
    } else if (bearing < 123.75) {
        retValue = 'east-southeast';
    } else if (bearing < 146.25) {
        retValue = 'southeast';
    } else if (bearing < 168.75) {
        retValue = 'south-southeast';
    } else if (bearing < 191.25) {
        retValue = 'south';
    } else if (bearing < 213.75) {
        retValue = 'south-southwest';
    } else if (bearing < 236.25) {
        retValue = 'southwest';
    } else if (bearing < 258.75) {
        retValue = 'west-southwest';
    } else if (bearing < 281.25) {
        retValue = 'west';
    } else if (bearing < 303.75) {
        retValue = 'west-northwest';
    } else if (bearing < 326.25) {
        retValue = 'northwest';
    } else if (bearing < 348.75) {
        retValue = 'north-northwest';
    } else {
        retValue = 'north';
    }
    return retValue;
}

/*
Format number with commas.
From: http://stackoverflow.com/questions/2901102/how-to-print-a-number-with-commas-as-thousands-separators-in-javascript
*/
function numberWithCommas(x) {
    return x.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}