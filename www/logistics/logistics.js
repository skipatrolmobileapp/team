/*jshint strict: true */
/*jshint unused: false */
/*jslint node: true */
/*jslint indent: 4 */
/*jslint unparam:true */
/*global window, document, navigator, localStorage, ons, angular, module, moment, Math, LatLon, google, dspRequest, logisticsNavigator, dial, browse, niceMessage, openAd, havePatience, waitNoMore, numberWithCommas, writeOutBearing */
"use strict";

/*
Ski Patrol Mobile App
Copyright © 2014-2018, Gary Meyer.
All rights reserved.
*/

var sampling = false;

/*
A helper to hide territory menu items if there's nothing there.
*/
function hideMenuFor(label) {
    var territory = angular.fromJson(localStorage.getItem('OnsTerritory')),
        json = localStorage.getItem(label),
        item = null,
        hide = true,
        i = 0;
    if (json) {
        item = angular.fromJson(json);
        for (i = 0; i < item.length; i += 1) {
            if (territory && item[i].territory === territory.code) {
                hide = false;
            }
        }
    }
    return hide;
}

/*
Logistics.
*/
module.controller('LogisticsController', function ($rootScope, $scope, $http, AccessLogService) {
    var patrol = angular.fromJson(localStorage.getItem('DspPatrol')),
        role = localStorage.getItem('DspRole'),
        ads = angular.fromJson(localStorage.getItem('DspAd')),
        maps = angular.fromJson(localStorage.getItem('DspMap')),
        mapRequest = dspRequest('GET', '/team/_table/Map?order=name', null),
        territories = angular.fromJson(localStorage.getItem('DspTerritory')),
        nicknames = angular.fromJson(localStorage.getItem('DspNickname')),
        nicknameRequest = dspRequest('GET', '/team/_table/Nickname?order=territory,name', null),
        i;
    AccessLogService.log('info', 'Logistics');
    $scope.enableAd = false;
    $scope.showLocationFinder = false;
    if ('Basic' === role || 'Power' === role || 'Leader' === role) {
        if (navigator.geolocation) {
            $scope.showLocationFinder = true;
        }
    } else {
        if (ads && ('Yes' === patrol.showAds)) {
            for (i = 0; i < ads.length; i += 1) {
                if ('logistics' === ads[i].slot) {
                    $scope.adImageAddress = ads[i].imageAddress;
                    $scope.adLinkAddress = ads[i].linkAddress;
                    $scope.enableAd = true;
                }
            }
        }
    }
    sampling = false;
    if ('Yes' === patrol.haveQrCodes) {
        $scope.haveQrCodes = true;
    }
    if (window.plugins && window.plugins.barcodeScanner) {
        if (nicknames && (nicknames.length > 0)) {
            if ('Basic' === role || 'Power' === role || 'Leader' === role) {
                $scope.showQr = true;
            }
        }
    }
    $scope.maps = maps;
    if ((maps) && maps.length > 0) {
        $scope.showMaps = true;
    } else {
        $scope.showMaps = false;
    }
    if (patrol.territoryLabel) {
        $scope.territoryLabel = patrol.territoryLabel;
    } else {
        $scope.territoryLabel = 'Areas';
    }
    $scope.territories = territories;
    $http(mapRequest).
        success(function (data, status, headers, config) {
            $scope.maps = data.resource;
            if ((data.resource) && data.resource.length > 0) {
                $scope.showMaps = true;
            } else {
                $scope.showMaps = false;
            }
            localStorage.setItem('DspMap', angular.toJson(data.resource));
        }).
        error(function (data, status, headers, config) {
            AccessLogService.log('error', 'GetMapErr', niceMessage(data, status));
        });
    $http(nicknameRequest).
        success(function (data, status, headers, config) {
            localStorage.setItem('DspNickname', angular.toJson(data.resource));
            $scope.hideNicknames = hideMenuFor('DspNickname');
        }).
        error(function (data, status, headers, config) {
            AccessLogService.log('error', 'GetNicknameErr', niceMessage(data, status));
        });
    $scope.viewMap = function (index) {
        var maps = angular.fromJson(localStorage.getItem('DspMap'));
        if (maps && maps[index]) {
            localStorage.setItem('OnsMap', angular.toJson(maps[index]));
            logisticsNavigator.pushPage('logistics/map.html');
        }
    };
    $scope.adClick = function () {
        AccessLogService.log('info', 'AdClick', $scope.adLinkAddress);
        openAd($scope.adLinkAddress);
    };
    $scope.viewTerritory = function (index) {
        localStorage.setItem('OnsTerritory', angular.toJson($scope.territories[index]));
        logisticsNavigator.pushPage('logistics/territory.html');
    };
    ons.ready(function () {
        return;
    });
});

/*
Mark location.
*/
module.controller('MarkController', function ($rootScope, $scope, $http, AccessLogService) {
    var patrolPrefix = localStorage.getItem('DspPatrolPrefix'),
        map,
        marker;
    AccessLogService.log('info', 'Mark');
    if (navigator.geolocation) {
        havePatience($rootScope);
        $scope.message = 'Getting GPS location...';
        sampling = true;
        (function markSample() {
            if (!sampling) {
                return;
            }
            navigator.geolocation.getCurrentPosition(
                function (position) {
                    var pos = {
                            lat: position.coords.latitude,
                            lng: position.coords.longitude
                        },
                        googleElevationRequest = {
                            method: 'GET',
                            cache: true,
                            timeout: 10000,
                            url: 'https://maps.googleapis.com/maps/api/elevation/json?key=AIzaSyBj-eidFQj3qVwMSo1v0PJ70xFaE13c_zc&locations=' + pos.lat + ',' + pos.lng
                        },
                        elevation;
                    if (map) {
                        map.setCenter(pos);                        
                    } else {
                        map = new google.maps.Map(document.getElementById('map'), {
                            center: pos,
                            zoom: 19,
                            mapTypeId: google.maps.MapTypeId.SATELLITE,
                            scrollwheel: false,
                            disableDefaultUI: true
                        });
                    }
                    if (marker) {
                        marker.setMap(null);
                    }
                    marker = new google.maps.Marker({
                        map: map,
                        position: pos,
                        title: 'My position',
                        icon: 'img/patient.png'                
                    });
                    $scope.latitude = pos.lat;
                    $scope.longitude = pos.lng;
                    $scope.accuracy = position.coords.accuracy;
                    $scope.altitude = position.coords.altitude;
                    $scope.altitudeAccuracy = position.coords.altitudeAccuracy;
                    $scope.heading = position.coords.heading;
                    $scope.speed = position.coords.speed;
                    $scope.letMarkIt = true;
                    $scope.message = null;
                    $http(googleElevationRequest).
                        success(function (data, status, headers, config) {
                            elevation = data.results[0].elevation;
                            $scope.elevation = elevation;
                            waitNoMore();
                        }).
                        error(function (data, status, headers, config) {
                            $scope.elevation = position.coords.altitude;
                            AccessLogService.log('error', 'GetElevationErr', niceMessage(data, status));
                            waitNoMore();
                        });                
                },
                function (message) {
                    $scope.message = 'Unable to get current location. Ensure your GPS is turned on and give it a few moments to acquire a signal.';
                    AccessLogService.log('warn', 'Geolocation', message);
                    waitNoMore();
                },
                {
                    timeout: 5000,
                    enableHighAccuracy: true,
                    maximumAge: 2000
                }
            );
            setTimeout(markSample, 2000);
        })();
    } else {
        $scope.message = 'Unable to get current location. Ensure your GPS is turned on and give it a few moments to acquire a signal.';
        AccessLogService.log('info', 'Geolocation', 'Not available');
    }
    $scope.mark = function() {
        var body = { resource: [{
                "tenantId": patrolPrefix,
                "userId": localStorage.getItem('DspUserId'),
                "userName": localStorage.getItem('DspName'),
                "scannedOn": moment().format('YYYY-MM-DD HH:mm:ss') + ' UTC',
                "latitude": $scope.latitude,
                "longitude": $scope.longitude,
                "accuracy": $scope.accuracy,
                "elevation": $scope.elevation,
                "altitude": $scope.altitude,
                "altitudeAccuracy": $scope.altitudeAccuracy,
                "heading": $scope.heading,
                "speed": $scope.speed
            }]},
            geoMarkRequest = dspRequest('POST', '/team/_table/GeoMark', body);
        havePatience($rootScope);
        $http(geoMarkRequest).
            success(function (data, status, headers, config) {
                $scope.message ='GPS marked location sent to server.';
                $scope.letMarkIt = null;
                waitNoMore();
            }).
            error(function (data, status, headers, config) {
                AccessLogService.log('error', 'PostGeoMarkErr', niceMessage(data, status));
                $scope.message = 'Failed to send GPS marked location to server; try again.';
                waitNoMore();
            });
    };
    $scope.close = function () {
        sampling = false;
        logisticsNavigator.popPage();
    };
    ons.ready(function () {
        return;
    });
});

/*
Marked geolocations.
*/
module.controller('MarkedController', function ($rootScope, $scope, $http, AccessLogService) {
    var aDayAgo = moment().subtract(1, 'days').format('YYYY-MM-DD HH:mm:ss'),
        geoMarkRequest = dspRequest('GET', '/team/_table/GeoMark?filter=scannedOn%3E%22' + aDayAgo + '%22&order=scannedOn%20desc', null);
    AccessLogService.log('info', 'Marked');
    havePatience($rootScope);
    $http(geoMarkRequest).
        success(function (data, status, headers, config) {
            $scope.geoMarks = data.resource;
            if ((data.resource) && (0 === data.resource.length)) {
                $scope.message = 'This feature can be used to mark the latitude and longitude of a spot on the mountain, such as for marking a location in the trees or out-of-bounds for follow-on patrollers to more quickly find.';
            }
            waitNoMore();
        }).
        error(function (data, status, headers, config) {
            AccessLogService.log('error', 'GeoMarkErr', niceMessage(data, status));
            $scope.message = 'Failed to access server; try again.';
            waitNoMore();
        });
    $scope.view = function (index) {
        localStorage.setItem('OnsGeoMark', angular.toJson($scope.geoMarks[index]));
        logisticsNavigator.pushPage('logistics/find.html');
    };
    $scope.close = function () {
        logisticsNavigator.popPage();
    };
    ons.ready(function () {
        return;
    });
});

/*
Find a marked geolocations.
*/
module.controller('FindController', function ($rootScope, $scope, $http, AccessLogService) {
    var patrol = angular.fromJson(localStorage.getItem('DspPatrol')),
        geoMark = angular.fromJson(localStorage.getItem('OnsGeoMark')),
        pos = {
            lat: geoMark.latitude,
            lng: geoMark.longitude
        },
        geoMarkWhereabouts = new LatLon(geoMark.latitude, geoMark.longitude),
        map = new google.maps.Map(document.getElementById('map'), {
            center: pos,
            zoom: 19,
            mapTypeId: google.maps.MapTypeId.SATELLITE,
            scrollwheel: false,
            disableDefaultUI: true
        }),
        marker = new google.maps.Marker({
            map: map,
            position: pos,
            title: geoMark.userName,
            icon: 'img/patient.png'
        }),
        myMarker;
    AccessLogService.log('info', 'Find', pos.lat + ', ' + pos.lng);
    if (navigator.geolocation) {
        havePatience($rootScope);
        $scope.message = 'Getting GPS location...';
        sampling = true;
        (function findSample() {
            if (!sampling) {
                return;
            }
            navigator.geolocation.getCurrentPosition(
                function (position) {
                    var myPos = {
                            lat: position.coords.latitude,
                            lng: position.coords.longitude
                        },
                        myWhereabouts = new LatLon(position.coords.latitude, position.coords.longitude),
                        meters = myWhereabouts.distanceTo(geoMarkWhereabouts),
                        bearing = myWhereabouts.bearingTo(geoMarkWhereabouts),
                        directions,
                        googleElevationRequest = {
                            method: 'GET',
                            cache: true,
                            timeout: 10000,
                            url: 'https://maps.googleapis.com/maps/api/elevation/json?key=AIzaSyBj-eidFQj3qVwMSo1v0PJ70xFaE13c_zc&locations=' + myPos.lat + ',' + myPos.lng
                        },
                        elevation,
                        tip,
                        bounds = new google.maps.LatLngBounds();
                    if ('USA' === patrol.country) {
                        if (meters > 500) {
                            directions = numberWithCommas(Math.round(10 * meters / 1609.34) / 10) + ' miles';
                        } else {
                            directions = numberWithCommas(Math.round(meters * 1.09361)) + ' yards';
                        }
                    } else {
                        if (meters > 1000) {
                            directions = numberWithCommas(Math.round(meters / 1000)) + ' km';
                        } else {
                            directions = numberWithCommas(Math.round(meters)) + ' m';
                        }
                    }
                    directions = directions + ' ' + writeOutBearing(bearing);
                    $http(googleElevationRequest).
                        success(function (data, status, headers, config) {
                            elevation = data.results[0].elevation;
                            if (null === geoMark.elevation) {
                                geoMark.elevation = geoMark.altitude;
                            }
                            if (geoMark.elevation && elevation) {
                                if (geoMark.elevation > elevation) {
                                    if ('USA' === patrol.country) {
                                        tip = Math.round(3.28084 * (geoMark.elevation - elevation)) + ' ft above you';
                                    } else {
                                        tip = Math.round(geoMark.elevation - elevation) + ' m above you';
                                    }
                                } else {
                                    if ('USA' === patrol.country) {
                                        tip = Math.round(3.28084 * (elevation - geoMark.elevation)) + ' ft below you';
                                    } else {
                                        tip = Math.round(elevation - geoMark.elevation) + ' m below you';
                                    }
                                }
                                $scope.message = directions + ', ' + tip;
                            } else {
                                $scope.message = directions;                    
                            }
                            if (myMarker) {
                                myMarker.setMap(null);
                            }
                            myMarker = new google.maps.Marker({
                                map: map,
                                position: myPos,
                                title: 'My position',
                                icon: 'img/skier.png'
                            });
                            bounds.extend(marker.getPosition());
                            bounds.extend(myMarker.getPosition());
                            map.fitBounds(bounds);
                            // $scope.$apply();
                            waitNoMore();
                        }).
                        error(function (data, status, headers, config) {
                            AccessLogService.log('error', 'GetElevationErr', niceMessage(data, status));
                            waitNoMore();
                        });                
                },
                function (message) {
                    $scope.message = 'Unable to get current location. Ensure your GPS is turned on and give it a few moments to acquire a signal.';
                    map.setCenter(pos);
                    waitNoMore();
                    AccessLogService.log('warn', 'Geolocation', message);
                },
                {
                    timeout: 5000,
                    enableHighAccuracy: true,
                    maximumAge: 5000
                }
            );
            setTimeout(findSample, 10000);
        })();
    } else {
        $scope.message = 'Unable to get current location. Ensure your GPS is turned on and give it a few moments to acquire a signal.';
        map.setCenter(pos);
        AccessLogService.log('info', 'Geolocation', 'Not available');
    }
    $scope.close = function () {
        sampling = false;
        logisticsNavigator.popPage();
    };
    ons.ready(function () {
        return;
    });
});

/*
Post QR code scans.
TODO: Make this queue based for QR codes out of data connection range.
*/
function postQrCodeScan($http, $scope, AccessLogService, nickname, longitude, latitude) {
    var patrolPrefix = localStorage.getItem('DspPatrolPrefix'),
        userId = localStorage.getItem('DspUserId'),
        body = { resource: [{
            id: null,
            tenantId: patrolPrefix,
            location: nickname,
            userId: userId,
            scannedBy: localStorage.getItem('DspName'),
            scannedOn: moment().format('YYYY-MM-DD HH:mm:ss') + ' UTC',
            longitude: longitude,
            latitude: latitude
        }]},
        qrCodeScanPostRequest = dspRequest('POST', '/team/_table/QrCodeScan', body);
    $http(qrCodeScanPostRequest).
        success(function (data, status, headers, config) {
            $scope.scanned = nickname;
            fillInQrCodeScans($http, $scope, AccessLogService);
        }).
        error(function (data, status, headers, config) {
            AccessLogService.log('error', 'PostQrCodeScanErr', niceMessage(data, status));
            $scope.scanned = 'Failed to upload scan for ' + nickname;
        });
}

/*
Get and populate QR code scans.
*/
function fillInQrCodeScans($http, $scope, AccessLogService) {
    var i = 0,
        userId = localStorage.getItem('DspUserId'),
        qrCodeScans = angular.fromJson(localStorage.getItem('DspQrCodeScan')),
        qrCodeScanRequest = dspRequest('GET', '/team/_table/QrCodeScan?filter=userId%3D' + userId + '&order=scannedOn%20desc', null);
    if (qrCodeScans) {
        for (i = 0; i < qrCodeScans.length; i += 1) {
            qrCodeScans[i].scanned = moment(qrCodeScans[i].scannedOn).format('MMM D HH:mm');
        }
    }
    if (!qrCodeScans || qrCodeScans.length === 0) {
        $scope.message = 'Find the QR codes on the mountain and your scans will be listed here.';
    } else {
        $scope.message = '';
    }
    $scope.qrcodescans = qrCodeScans;
    qrCodeScanRequest.cache = false;
    $http(qrCodeScanRequest).
        success(function (data, status, headers, config) {
            qrCodeScans = data.resource;
            if (qrCodeScans) {
                for (i = 0; i < qrCodeScans.length; i += 1) {
                    qrCodeScans[i].scanned = moment(qrCodeScans[i].scannedOn).format('MMM D HH:mm');
                }
            }
            if (!qrCodeScans || qrCodeScans.length === 0) {
                $scope.message = 'Find the QR codes on the mountain and your scans will be listed here.';
            } else {
                $scope.message = '';
            }
            localStorage.setItem('DspQrCodeScan', angular.toJson(qrCodeScans));
            $scope.qrcodescans = qrCodeScans;
        }).
        error(function (data, status, headers, config) {
            $scope.message = niceMessage(data, status);
            if (AccessLogService) {
                AccessLogService.log('error', 'GetQrCodeScanErr', niceMessage(data, status));
            }
        });
}

/*
QR Code scanner.
*/
module.controller('QrCodeController', function ($scope, $http, AccessLogService) {
    var nicknames = angular.fromJson(localStorage.getItem('DspNickname')),
        i = 0,
        nickname,
        longitude,
        latitude;
    AccessLogService.log('info', 'QrCode');
    fillInQrCodeScans($http, $scope);
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
            function (position) {
                longitude = position.coords.longitude;
                latitude = position.coords.latitude;
            },
            function (message) {
                AccessLogService.log('warn', 'Geolocation', message);
            },
            {
                timeout: 5000,
                enableHighAccuracy: true,
                maximumAge: 5000
            }
        );
    } else {
        AccessLogService.log('info', 'Geolocation', 'Not available');
    }
    $scope.scan = function () {
        if (window.plugins && window.plugins.barcodeScanner) {
            window.plugins.barcodeScanner.scan(
                function (result) {
                    if (!result.cancelled) {
                        if (!nicknames) {
                            nicknames = [];
                        }
                        nickname = result.text;
                        for (i = 0; i < nicknames.length; i += 1) {
                            if ((nicknames[i].qrCodeUrl) && (result.text === nicknames[i].qrCodeUrl)) {
                                nickname = nicknames[i].name;
                            }
                        }
                        postQrCodeScan($http, $scope, AccessLogService, nickname, longitude, latitude);
                    }
                },
                function (error) {
                    $scope.scanned = 'Failed to scan ' +  error;
                }
            );
        }
    };
    $scope.close = function () {
        logisticsNavigator.popPage();
    };
    ons.ready(function () {
        return;
    });
});

/*
QR code leaderboard.
*/
module.controller('LeaderBoardController', function ($scope, $http, AccessLogService) {
    var qrCodeSummaryRequest = dspRequest('GET', '/team/_table/QrCodeSummary?order=scanCount%20desc,name', null);
    AccessLogService.log('info', 'LeaderBoard');
    $scope.leaders = angular.fromJson(localStorage.getItem('DspQrCodeSummary'));
    $scope.qrcodesummary = angular.fromJson(localStorage.getItem('DspQrCodeSummary'));
    qrCodeSummaryRequest.cache = false;
    $http(qrCodeSummaryRequest).
        success(function (data, status, headers, config) {
            localStorage.setItem('DspQrCodeSummary', angular.toJson(data.resource));
            $scope.leaders = data.resource;
            if (0 === data.resource.length) {
                $scope.message = 'Find the QR codes on the mountain and your scans will be listed here.';
            }
        }).
        error(function (data, status, headers, config) {
            AccessLogService.log('error', 'GetQrCodeSummaryErr', niceMessage(data, status));
        });

    $scope.close = function () {
        logisticsNavigator.popPage();
    };
    ons.ready(function () {
        return;
    });
});

/*
Map.
*/
module.controller('MapController', function ($scope, $http, AccessLogService) {
    var map = angular.fromJson(localStorage.getItem('OnsMap'));
    AccessLogService.log('info', 'Map', map.name);
    $scope.name = map.name;
    $scope.address = map.address;
    // https://res.cloudinary.com/skipatrol/image/upload/c_scale,r_0,w_300/v1444166196/WinterParkGuestMap.jpg
    if (map.address.indexOf('res.cloudinary.com')  > 0) {
        $scope.thumbnailAddress = map.address.replace("/upload/", "/upload/c_scale,r_0,w_300/");        
    } else {
        // $scope.thumbnailAddress = 'https://api.thumbalizr.com/?url=' + map.address;
        $scope.thumbnailAddress = map.address;
    }
    $scope.view = function () {
        browse($scope.address);
    };
    $scope.close = function () {
        logisticsNavigator.popPage();
    };
    ons.ready(function () {
        return;
    });
});

/*
Territory.
*/
module.controller('TerritoryController', function ($scope, $http, AccessLogService) {
    var territory = angular.fromJson(localStorage.getItem('OnsTerritory')),
        patrol = angular.fromJson(localStorage.getItem('DspPatrol')),
        role = localStorage.getItem('DspRole'),
        trailCheckRequest = dspRequest('GET', '/team/_table/TrailCheck?order=territory,name', null),
        aedRequest = dspRequest('GET', '/team/_table/Aed?order=territory,location', null),
        phoneRequest = dspRequest('GET', '/team/_table/Phone?order=territory,name', null),
        tobogganRequest = dspRequest('GET', '/team/_table/Toboggan?order=territory,name', null),
        sweepRequest = dspRequest('GET', '/team/_table/Sweep?order=territory,name', null);
    AccessLogService.log('info', 'Territory', territory.name);
    $scope.territory = territory.name;
    $scope.hideAeds = hideMenuFor('DspAed');
    $scope.hidePhones = hideMenuFor('DspPhone');
    $scope.hideNicknames = hideMenuFor('DspNickname');
    if ('Basic' === role || 'Power' === role || 'Leader' === role) {
        $scope.hideTrailChecks = hideMenuFor('DspTrailCheck');
        $scope.hideToboggans = hideMenuFor('DspToboggan');
        $scope.hideSweeps = hideMenuFor('DspSweep');
    } else {
        $scope.hideTrailChecks = true;
        $scope.hideToboggans = true;
        $scope.hideSweeps = true;
    }
    if (patrol.trailCheckLabel) {
        $scope.trailCheckLabel = patrol.trailCheckLabel;
    } else {
        $scope.trailCheckLabel = 'Trail Checks';
    }
    if (patrol.sweepLabel) {
        $scope.sweepLabel = patrol.sweepLabel;
    } else {
        $scope.sweepLabel = 'Sweeps';
    }
    if ('Basic' === role || 'Power' === role || 'Leader' === role) {
        $http(trailCheckRequest).
            success(function (data, status, headers, config) {
                localStorage.setItem('DspTrailCheck', angular.toJson(data.resource));
                $scope.hideTrailChecks = hideMenuFor('DspTrailCheck');
            }).
            error(function (data, status, headers, config) {
                AccessLogService.log('error', 'GetTrailCheckErr', niceMessage(data, status));
            });
        $http(tobogganRequest).
            success(function (data, status, headers, config) {
                localStorage.setItem('DspToboggan', angular.toJson(data.resource));
                $scope.hideToboggans = hideMenuFor('DspToboggan');
            }).
            error(function (data, status, headers, config) {
                AccessLogService.log('error', 'GetTobogganErr', niceMessage(data, status));
            });
        $http(sweepRequest).
            success(function (data, status, headers, config) {
                localStorage.setItem('DspSweep', angular.toJson(data.resource));
                $scope.hideSweeps = hideMenuFor('DspSweep');
            }).
            error(function (data, status, headers, config) {
                AccessLogService.log('error', 'GetSweepErr', niceMessage(data, status));
            });
    }
    $http(aedRequest).
        success(function (data, status, headers, config) {
            localStorage.setItem('DspAed', angular.toJson(data.resource));
            $scope.hideAeds = hideMenuFor('DspAed');
        }).
        error(function (data, status, headers, config) {
            AccessLogService.log('error', 'GetAedErr', niceMessage(data, status));
        });
    $http(phoneRequest).
        success(function (data, status, headers, config) {
            localStorage.setItem('DspPhone', angular.toJson(data.resource));
            $scope.hidePhones = hideMenuFor('DspPhone');
        }).
        error(function (data, status, headers, config) {
            AccessLogService.log('error', 'GetPhoneErr', niceMessage(data, status));
        });
    $scope.close = function () {
        logisticsNavigator.popPage();
    };
    ons.ready(function () {
        return;
    });
});

/*
Trail checks.
*/
module.controller('TrailChecksController', function ($scope, $http, AccessLogService) {
    var patrol = angular.fromJson(localStorage.getItem('DspPatrol')),
        territory = angular.fromJson(localStorage.getItem('OnsTerritory')),
        allTrailChecks = angular.fromJson(localStorage.getItem('DspTrailCheck')),
        trailChecks = [],
        n = 0,
        i = 0;
    AccessLogService.log('info', 'TrailChecks', territory.name);
    $scope.territory = territory.name;
    if (patrol.trailCheckLabel) {
        $scope.trailCheckLabel = patrol.trailCheckLabel;
    } else {
        $scope.trailCheckLabel = 'Trail Checks';
    }
    for (i = 0; i < allTrailChecks.length; i += 1) {
        if (allTrailChecks[i].territory === territory.code) {
            trailChecks[n] = allTrailChecks[i];
            n = n + 1;
        }
    }
    $scope.trailChecks = trailChecks;
    $scope.view = function (index) {
        localStorage.setItem('OnsTrailCheck', angular.toJson($scope.trailChecks[index]));
        logisticsNavigator.pushPage('logistics/trailcheck.html');
    };
    $scope.close = function () {
        logisticsNavigator.popPage();
    };
    ons.ready(function () {
        return;
    });
});

/*
Trail check.
*/
module.controller('TrailCheckController', function ($scope, $http, $sce, AccessLogService) {
    var trailCheck = angular.fromJson(localStorage.getItem('OnsTrailCheck'));
    AccessLogService.log('info', 'TrailCheck', trailCheck.name);
    $scope.name = trailCheck.name;
    if (trailCheck.description) {
        $scope.description = $sce.trustAsHtml(trailCheck.description.replace(/(\r\n|\n|\r)/g, "<br />"));
    } else {
        $scope.description = '';
    }
    $scope.close = function () {
        logisticsNavigator.popPage();
    };
    ons.ready(function () {
        return;
    });
});

/*
AEDs.
*/
module.controller('AedsController', function ($scope, $http, AccessLogService) {
    var territory = angular.fromJson(localStorage.getItem('OnsTerritory')),
        allAeds = angular.fromJson(localStorage.getItem('DspAed')),
        aeds = [],
        n = 0,
        i = 0;
    AccessLogService.log('info', 'Aeds', territory.name);
    $scope.territory = territory.name;
    for (i = 0; i < allAeds.length; i += 1) {
        if (allAeds[i].territory === territory.code) {
            aeds[n] = allAeds[i];
            n = n + 1;
        }
    }
    $scope.aeds = aeds;
    $scope.view = function (index) {
        localStorage.setItem('OnsAed', angular.toJson(aeds[index]));
        logisticsNavigator.pushPage('logistics/aed.html');
    };
    $scope.close = function () {
        logisticsNavigator.popPage();
    };
    ons.ready(function () {
        return;
    });
});

/*
AED.
*/
module.controller('AedController', function ($scope, $http, AccessLogService) {
    var aed = angular.fromJson(localStorage.getItem('OnsAed'));
    AccessLogService.log('info', 'Aed', aed.location);
    $scope.location = aed.location;
    $scope.description = aed.description;
    $scope.close = function () {
        logisticsNavigator.popPage();
    };
    ons.ready(function () {
        return;
    });
});

/*
Phones.
*/
module.controller('PhonesController', function ($scope, $http, AccessLogService) {
    var role = localStorage.getItem('DspRole'),
        territory = angular.fromJson(localStorage.getItem('OnsTerritory')),
        allPhones = angular.fromJson(localStorage.getItem('DspPhone')),
        phones = [],
        n = 0,
        i = 0;
    AccessLogService.log('info', 'Phones', territory.name);
    $scope.territory = territory.name;
    for (i = 0; i < allPhones.length; i += 1) {
        if (allPhones[i].territory === territory.code) {
            phones[n] = allPhones[i];
            if ('Guest' === role) {
                phones[n].name = phones[n].publicName;
            }
            n = n + 1;
        }
    }
    $scope.phones = phones;
    $scope.view = function (index) {
        localStorage.setItem('OnsPhone', angular.toJson(phones[index]));
        logisticsNavigator.pushPage('logistics/phone.html');
    };
    $scope.close = function () {
        logisticsNavigator.popPage();
    };
    ons.ready(function () {
        return;
    });
});

/*
Phone.
*/
module.controller('PhoneController', function ($scope, $http, AccessLogService) {
    var role = localStorage.getItem('DspRole'),
        phone = angular.fromJson(localStorage.getItem('OnsPhone')),
        notes;
    AccessLogService.log('info', 'Phone', phone.name);
    if ('Basic' === role || 'Power' === role || 'Leader' === role) {
        $scope.name = phone.name;
        $scope.location = phone.location;
    } else {
        $scope.name = phone.publicName;
        $scope.location = '';
    }
    if ((phone.number) && (phone.number.length > 6)) {
        $scope.hide = false;
        $scope.number = phone.number;
        $scope.notes = phone.notes;
    } else {
        $scope.hide = true;
        if (phone.number) {
            notes = phone.number;
        }
        if (phone.notes) {
            notes += ' ' + phone.notes;
        }
        $scope.notes = notes;
    }
    $scope.call = function () {
        dial($scope.number);
        AccessLogService.log('info', 'Phone', $scope.number);
    };
    $scope.close = function () {
        logisticsNavigator.popPage();
    };
    ons.ready(function () {
        return;
    });
});

/*
Nicknames.
*/
module.controller('NicknamesController', function ($scope, $http, AccessLogService) {
    var territory = angular.fromJson(localStorage.getItem('OnsTerritory')),
        allNicknames = angular.fromJson(localStorage.getItem('DspNickname')),
        nicknames = [],
        n = 0,
        i = 0;
    AccessLogService.log('info', 'Nicknames', territory.name);
    $scope.territory = territory.name;
    for (i = 0; i < allNicknames.length; i += 1) {
        if (allNicknames[i].territory === territory.code) {
            nicknames[n] = allNicknames[i];
            n = n + 1;
        }
    }
    $scope.nicknames = nicknames;
    $scope.view = function (index) {
        localStorage.setItem('OnsNickname', angular.toJson(nicknames[index]));
        logisticsNavigator.pushPage('logistics/nickname.html');
    };
    $scope.close = function () {
        logisticsNavigator.popPage();
    };
    ons.ready(function () {
        return;
    });
});

/*
Get elevation of the current position and show vertical gain/loss to target elevation.
*/
function showVertical($scope, $http, AccessLogService, myLatitude, myLongitude, elevation) {
    var patrol = angular.fromJson(localStorage.getItem('DspPatrol')),
        googleElevationRequest,
        myElevation,
        elevationChangeElement = document.getElementById('elevationChange');
    if (elevation) {
        googleElevationRequest = {
            method: 'GET',
            cache: true,
            timeout: 10000,
            url: 'https://maps.googleapis.com/maps/api/elevation/json?key=AIzaSyBj-eidFQj3qVwMSo1v0PJ70xFaE13c_zc&locations=' + myLatitude + ',' + myLongitude
        };
        $http(googleElevationRequest).
            success(function (data, status, headers, config) {
                myElevation = data.results[0].elevation;
                if (myElevation > elevation) {
                    if ('USA' === patrol.country) {
                        elevationChangeElement.innerHTML = 'You are ' + numberWithCommas(Math.round((myElevation - elevation) * 3.28084)) + ' vertical feet above';
                    } else {
                        elevationChangeElement.innerHTML = 'You are ' + numberWithCommas(Math.round(myElevation - elevation)) + ' vertical m above';
                    }
                } else {
                    if ('USA' === patrol.country) {
                        elevationChangeElement.innerHTML = 'You are ' + numberWithCommas(Math.round((elevation - myElevation) * 3.28084)) + ' vertical feet BELOW';
                    } else {
                        elevationChangeElement.innerHTML = 'You are ' + numberWithCommas(Math.round(elevation - myElevation)) + ' vertical m BELOW';
                    }
                }
            }).
            error(function (data, status, headers, config) {
                AccessLogService.log('error', 'GetElevationErr', niceMessage(data, status));
                elevationChangeElement.innerHTML = 'Elevation not available';
            });
    }
}

/*
Get the distance and directions to the target.
*/
function showDirections($scope, $http, AccessLogService, latitude, longitude) {
    var patrol = angular.fromJson(localStorage.getItem('DspPatrol')),
        nickname = angular.fromJson(localStorage.getItem('OnsNickname'));
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
            function (position) {
                var myLongitude = position.coords.longitude,
                    myLatitude = position.coords.latitude,
                    myWhereabouts = new LatLon(myLatitude, myLongitude),
                    nicknameWhereabouts = new LatLon(latitude, longitude),
                    meters = myWhereabouts.distanceTo(nicknameWhereabouts),
                    directionsElement = document.getElementById('directions'),
                    directions,
                    bearing = myWhereabouts.bearingTo(nicknameWhereabouts);
                if ('USA' === patrol.country) {
                    if (meters > 1000) {
                        directions = numberWithCommas(Math.round(meters / 1609.34)) + ' miles';
                    } else {
                        directions = numberWithCommas(Math.round(meters * 1.09361)) + ' yards';
                    }
                } else {
                    if (meters > 1000) {
                        directions = numberWithCommas(Math.round(meters / 1000)) + ' km';
                    } else {
                        directions = numberWithCommas(Math.round(meters)) + ' m';
                    }
                }
                directions = 'Location is ' + directions + ' ' + writeOutBearing(bearing);
                directionsElement.innerHTML = directions;
                showVertical($scope, $http, AccessLogService, myLatitude, myLongitude, nickname.elevation);
            },
            function (message) {
                var directionsElement = document.getElementById('directions');
                directionsElement.innerHTML = 'Geolocation not available';
                AccessLogService.log('warn', 'Geolocation', message);
            },
            {
                timeout: 5000,
                enableHighAccuracy: true,
                maximumAge: 5000
            }
        );
    } else {
        AccessLogService.log('info', 'Geolocation', 'Not available');
    }
}

/*
Nickname.
*/
module.controller('NicknameController', function ($scope, $http, AccessLogService) {
    var nickname = angular.fromJson(localStorage.getItem('OnsNickname'));
    AccessLogService.log('info', 'Nickname', nickname.name);
    $scope.name = nickname.name;
    if (nickname.alsoCalled) {
        $scope.alsoCalled = nickname.alsoCalled;
    } else {
        $scope.hideAlsoCalled = true;
    }
    if (!nickname.qrCodeUrl) {
        $scope.hideQrCodeTease = true;
    }
    if (nickname.latitude && nickname.longitude) {
        showDirections($scope, $http, AccessLogService, nickname.latitude, nickname.longitude);
    } else {
        document.getElementById('directions').innerHTML = '';
    }
    $scope.notes = nickname.notes;
    $scope.close = function () {
        logisticsNavigator.popPage();
    };
    ons.ready(function () {
        return;
    });
});

/*
Toboggans.
*/
module.controller('ToboggansController', function ($scope, $http, AccessLogService) {
    var territory = angular.fromJson(localStorage.getItem('OnsTerritory')),
        allToboggans = angular.fromJson(localStorage.getItem('DspToboggan')),
        toboggans = [],
        n = 0,
        i = 0;
    AccessLogService.log('info', 'Toboggans', territory.name);
    $scope.territory = territory.name;
    for (i = 0; i < allToboggans.length; i += 1) {
        if (allToboggans[i].territory === territory.code) {
            toboggans[n] = allToboggans[i];
            n = n + 1;
        }
    }
    $scope.toboggans = toboggans;
    $scope.view = function (index) {
        localStorage.setItem('OnsToboggan', angular.toJson(toboggans[index]));
        logisticsNavigator.pushPage('logistics/toboggan.html');
    };
    $scope.close = function () {
        logisticsNavigator.popPage();
    };
    ons.ready(function () {
        return;
    });
});

/*
Toboggan.
*/
module.controller('TobogganController', function ($scope, $http, AccessLogService) {
    var toboggan = angular.fromJson(localStorage.getItem('OnsToboggan'));
    AccessLogService.log('info', 'Toboggan', toboggan.name);
    $scope.name = toboggan.name;
    $scope.location = toboggan.location;
    // TODO: Add GPS locator...
    $scope.hide = true;
    $scope.locate = function () {
        // TODO
        AccessLogService.log('info', 'Locate', $scope.name);
    };
    $scope.close = function () {
        logisticsNavigator.popPage();
    };
    ons.ready(function () {
        return;
    });
});

/*
Sweeps.
*/
module.controller('SweepsController', function ($scope, $http, AccessLogService) {
    var patrol = angular.fromJson(localStorage.getItem('DspPatrol')),
        territory = angular.fromJson(localStorage.getItem('OnsTerritory')),
        allSweeps = angular.fromJson(localStorage.getItem('DspSweep')),
        sweeps = [],
        n = 0,
        i = 0;
    AccessLogService.log('info', 'Sweeps', territory.name);
    $scope.territory = territory.name;
    if (patrol.sweepLabel) {
        $scope.sweepLabel = patrol.sweepLabel;
    } else {
        $scope.sweepLabel = 'Sweeps';
    }
    for (i = 0; i < allSweeps.length; i += 1) {
        if (allSweeps[i].territory === territory.code) {
            sweeps[n] = allSweeps[i];
            n = n + 1;
        }
    }
    $scope.sweeps = sweeps;
    $scope.view = function (index) {
        localStorage.setItem('OnsSweep', angular.toJson($scope.sweeps[index]));
        logisticsNavigator.pushPage('logistics/sweep.html');
    };
    $scope.close = function () {
        logisticsNavigator.popPage();
    };
    ons.ready(function () {
        return;
    });
});

/*
Sweep.
*/
module.controller('SweepController', function ($scope, $http, $sce, AccessLogService) {
    var sweep = angular.fromJson(localStorage.getItem('OnsSweep'));
    AccessLogService.log('info', 'Sweep', sweep.name);
    $scope.name = sweep.name;
    if (sweep.description) {
        $scope.description = $sce.trustAsHtml(sweep.description.replace(/(\r\n|\n|\r)/g, "<br />"));
    } else {
        $scope.description = '';
    }
    $scope.close = function () {
        logisticsNavigator.popPage();
    };
    ons.ready(function () {
        return;
    });
});