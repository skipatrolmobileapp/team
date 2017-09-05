/*jshint strict: true */
/*jshint unused: false */
/*jslint node: true */
/*jslint indent: 4 */
/*jslint unparam:true */
/*global navigator, localStorage, ons, angular, module, moment, jsSHA, Camera, DSP_BASE_URL, DSP_API_KEY, dspRequest, homeNavigator, havePatience, waitNoMore, browse, openAd, niceMessage, writeOutBearing, settingAppName, settingPickPatrolScreen, settingSnowConditionsImage */
"use strict";

/*
Ski Patrol Mobile App
Copyright © 2014-2017, Gary Meyer.
All rights reserved.
*/

/*
Global initialization indicator.
*/
var haveInitializedApp = false;

/*
Go back to the home screen.
*/
function h() {
    console.debug('Go home!');
    homeNavigator.popPage();
}

/*
Start the app. Direct the user to register, login, or just show the live home screen.
*/
module.controller('HomeController', function ($rootScope, $scope, $http, AccessLogService) {
    var patrolPrefix = localStorage.getItem('DspPatrolPrefix'),
        role = localStorage.getItem('DspRole'),
        adRequest = dspRequest('GET', '/team/_table/Ad', null),
        email = localStorage.getItem('DspEmail'),
        password = localStorage.getItem('DspPassword'),
        introDone = localStorage.getItem('OnsIntroDone'),
        body = {
            email: email,
            password: password,
            duration: 31104000
        },
        sessionRequest = dspRequest('POST', '/user/session', body),
        patrolRequest = dspRequest('GET', '/team/_table/PatrolOrg?filter=tenantId="' + patrolPrefix + '"', null);
    $http(adRequest).
        success(function (data, status, headers, config) {
            localStorage.setItem('DspAd', angular.toJson(data.resource));
        }).
        error(function (data, status, headers, config) {
            AccessLogService.log('info', 'AdErr', data);
        });
    $rootScope.homeTab = true;
    $rootScope.logisticsTab = null;
    if (password) {
        if (haveInitializedApp) {
            $rootScope.hideTabs = false;
            homeNavigator.resetToPage('home/live.html', {animation: 'none'});
        } else {
            AccessLogService.log('info', 'Home', 'Load');
            havePatience($rootScope);
            $scope.loading = '';
            $http(sessionRequest).
                success(function (data, status, headers, config) {
                    $scope.loading = '';
                    localStorage.setItem('DspUserId', data.id);
                    localStorage.setItem('DspEmail', body.email);
                    localStorage.setItem('DspPassword', body.password);
                    localStorage.setItem('DspRole', data.role);
                    localStorage.setItem('DspName', data.first_name);
                    localStorage.setItem('DspPatrolPrefix', data.last_name);
                    AccessLogService.log('info', 'Session', data.first_name);
                    $http(patrolRequest).
                        success(function (data, status, headers, config) {
                            var alertRoles,
                                i;
                            localStorage.setItem('DspPatrol', angular.toJson(data.resource[0]));
                            $scope.loading = '';
                            haveInitializedApp = true;
                            $rootScope.hideTabs = false;
                            homeNavigator.resetToPage('home/live.html', {animation: 'none'});
                            waitNoMore();
                            if (data.resource[0].alert) {
                                alertRoles = data.resource[0].alertRolesCsv.split(',');
                                for (i = 0; i < alertRoles.length; i += 1) {
                                    if ((alertRoles[i] === role) && (data.resource[0].alert)) {
                                        ons.notification.alert({
                                            "title": "Notice",
                                            "message": data.resource[0].alert
                                        });
                                    }
                                }
                            }
                        }).
                        error(function (data, status, headers, config) {
                            AccessLogService.log('info', 'PatrolErr', data);
                            $rootScope.hideTabs = false;
                            homeNavigator.resetToPage('home/live.html', {animation: 'none'});
                            waitNoMore();
                        });
                }).
                error(function (data, status, headers, config) {
                    AccessLogService.log('info', 'SessionErr', data);
                    if ((data) && (data.error) && (data.error[0]) && ('Invalid user name and password combination.' === data.error[0].message)) {
                        homeNavigator.resetToPage('home/login.html', {animation: 'none'});
                    } else {
                        $rootScope.hideTabs = false;
                        homeNavigator.resetToPage('home/live.html', {animation: 'none'});
                    }
                    waitNoMore();
                });
        }
    } else {
        if (introDone) {
            AccessLogService.log('info', 'Home', 'Login');
            $rootScope.hideTabs = true;
            homeNavigator.resetToPage('home/login.html', {animation: 'none'});
        } else {
            AccessLogService.log('info', 'Home', 'Register');
            $rootScope.hideTabs = true;
            homeNavigator.resetToPage('home/intro.html', {animation: 'none'});
        }
    }
    ons.ready(function () {
        return;
    });
});

/*
Get the user going on a new registration.
*/
module.controller('IntroController', function ($rootScope, $scope, $http, AccessLogService) {
    AccessLogService.log('info', 'Intro');
    if (!settingAppName) {
        settingAppName = 'the Ski Patrol Mobile App'; // jshint ignore:line
    }
    $scope.settingAppName = settingAppName;
    localStorage.removeItem('DspPassword');
    $scope.start = function () {
        var patrolRequest = dspRequest('GET', '/team/_table/PatrolOrg?order=patrolName', null);
        havePatience($rootScope);
        $http(patrolRequest).
            success(function (data, status, headers, config) {
                localStorage.setItem('DspAllPatrol', angular.toJson(data.resource));
                waitNoMore();
                homeNavigator.pushPage('home/name.html');
            }).
            error(function (data, status, headers, config) {
                AccessLogService.log('error', 'GetPatrolErr', niceMessage(data, status));
                waitNoMore();
            });
    };
    $scope.login = function () {
        homeNavigator.resetToPage('home/login.html');
    };
    $scope.exit = function () {
        navigator.app.exitApp();
    };
    ons.ready(function () {
        return;
    });
});

/*
Ask the user their name.
*/
module.controller('NameController', function ($scope, AccessLogService) {
    AccessLogService.log('info', 'Name');
    $scope.firstName = localStorage.getItem('OnsFirstName');
    $scope.lastName = localStorage.getItem('OnsLastName');
    $scope.message = 'Enter your first name and last name in the fields below. Then tap "Next."';
    $scope.next = function () {
        if ((!$scope.firstName) || (!$scope.lastName)) {
            $scope.message = 'Name is required for registration.';
        } else {
            $scope.message = null;
            localStorage.setItem('OnsFirstName', $scope.firstName);
            localStorage.setItem('OnsLastName', $scope.lastName);
            if (!settingPickPatrolScreen) {
                settingPickPatrolScreen = 'home/pickpatrol.html'; // jshint ignore:line
            }
            homeNavigator.pushPage(settingPickPatrolScreen);
        }
    };
    $scope.back = function () {
        homeNavigator.popPage();
    };
    ons.ready(function () {
        return;
    });
});

/*
Ask the user which patrol they are part of.
*/
module.controller('PickPatrolController', function ($scope, $http, AccessLogService) {
    var patrols = angular.fromJson(localStorage.getItem('DspAllPatrol'));
    AccessLogService.log('info', 'PickPatrol');
    $scope.patrols = [];
    $scope.patrolName = localStorage.getItem('DspPatrolName');
    $scope.message = 'Start typing the name of your resort in the field below. Select. Then tap "Next."';
    $scope.focusElement = 'patrolName';
    $scope.search = function (patrolName) {
        var n = 0,
            i = 0;
        $scope.patrols = [];
        patrolName = patrolName.toLowerCase();
        if ((patrolName) && (patrolName.length > 1)) {
            for (i = 0; i < patrols.length; i += 1) {
                if ((patrols[i].patrolName) && (patrols[i].patrolName.toLowerCase().indexOf(patrolName) > -1)) {
                    $scope.patrols[n] = patrols[i];
                    n += 1;
                }
            }
        }
    };
    $scope.tap = function (index) {
        var patrol = $scope.patrols[index];
        if (patrol) {
            if (patrol.patrolName) {
                $scope.patrolName = $scope.patrols[index].patrolName;
                localStorage.setItem('DspPatrolName', $scope.patrols[index].patrolName);
            }
            if (patrol.tenantId) {
                localStorage.setItem('DspPatrolPrefix', $scope.patrols[index].tenantId);
            }
        }
        $scope.patrols = [];
    };
    $scope.back = function () {
        homeNavigator.popPage();
    };
    $scope.next = function () {
        var patrolName = localStorage.getItem('DspPatrolName');
        if (!patrolName) {
            $scope.message = 'Patrol is required for registration.';
        } else {
            $scope.message = null;
            homeNavigator.pushPage('home/tsandcsm52.html');
        }
    };
    ons.ready(function () {
        return;
    });
});

/*
Assume user is part of Winter Park.
*/
module.controller('PickWinterParkController', function ($scope, $http, AccessLogService) {
    AccessLogService.log('info', 'PickWinterPark');
    $scope.back = function () {
        homeNavigator.popPage();
    };
    $scope.next = function () {
        localStorage.setItem('DspPatrolName', 'Winter Park');
        localStorage.setItem('DspPatrolPrefix', 'WinterPark');
        homeNavigator.pushPage('home/tsandcs.html');
    };
    ons.ready(function () {
        return;
    });
});

/*
Ensure the user accepts the terms of service and privacy policy.
*/
module.controller('TsAndCsController', function ($scope, $http, AccessLogService) {
    AccessLogService.log('info', 'TsAndCs');
    $scope.accept = function () {
        homeNavigator.pushPage('home/registration.html');
    };
    $scope.back = function () {
        homeNavigator.popPage();
    };
    ons.ready(function () {
        return;
    });
});

/*
Register the user with the server all proper and that.
*/
module.controller('RegistrationController', function ($rootScope, $scope, $http, AccessLogService) {
    AccessLogService.log('info', 'Registration');
    localStorage.removeItem('DspPassword');
    $scope.email = localStorage.getItem('DspEmail');
    $scope.message = 'Enter your email address (use the one from your roster if you are on a patrol). Then tap "Register." Note: Entering a fake email address will not enable you to complete registration.';
    $scope.register = function () {
        var name = localStorage.getItem('OnsFirstName') + ' ' + localStorage.getItem('OnsLastName'),
            patrolPrefix = localStorage.getItem('DspPatrolPrefix'),
            body = {
                email: $scope.email,
                first_name: name,
                last_name: patrolPrefix,
                display_name: name + ' (' + localStorage.getItem('DspPatrolName') + ')'
            },
            registrationRequest = dspRequest('POST', '/user/register?login=true', body);
        if (!$scope.email) {
            $scope.message = 'Email address is required for registration.';
        } else {
            localStorage.setItem('DspEmail', $scope.email);
            $scope.message = 'Registering...';
            $http(registrationRequest).
                success(function (data, status, headers, config) {
                    AccessLogService.log('info', 'Registration');
                    localStorage.removeItem('DspAllPatrol');
                    localStorage.removeItem('OnsFirstName');
                    localStorage.removeItem('OnsLastName');
                    homeNavigator.pushPage('home/confirmation.html');
                    waitNoMore();
                }).
                error(function (data, status, headers, config) {
                    AccessLogService.log('warn', 'RegistrationErr', niceMessage(data, status));
                    $scope.message = 'This email address or name in this patrol has already been registered. Rather than creating a new account, try logging in by clicking "Login" below.';
                    $scope.showLogin = true;
                    waitNoMore();
                });
        }
    };
    $scope.back = function () {
        homeNavigator.popPage();
    };
    $scope.login = function () {
        homeNavigator.resetToPage('home/login.html');
    };
    ons.ready(function () {
        return;
    });
});

/*
Let the user know they still need to confirm their account via the email sent.
*/
module.controller('ConfirmationController', function ($scope, $http, AccessLogService) {
    AccessLogService.log('info', 'Confirmation');
    localStorage.setItem('OnsIntroDone', new Date());
    $scope.restart = function () {
        homeNavigator.resetToPage('home/home.html');
    };
    $scope.exit = function () {
        navigator.app.exitApp();
    };
    ons.ready(function () {
        return;
    });
});

/*
Log in the user.
*/
module.controller('LoginController', function ($rootScope, $scope, $http, AccessLogService) {
    var email = localStorage.getItem('DspEmail');
    AccessLogService.log('info', 'Login');
    $rootScope.hideTabs = true;
    if (email) {
        $scope.email = email;
        $scope.focusElement = "password";
    } else {
        $scope.focusElement = "email";
    }
    $scope.login = function () {
        var body = {
                email: $scope.email,
                password: $scope.password,
                duration: 31104000
            },
            sessionRequest = dspRequest('POST', '/user/session', body);
        if (!$scope.email) {
            $scope.message = 'Email is required. Try again.';
        } else if (!$scope.password) {
            localStorage.setItem('DspEmail', $scope.email);
            $scope.message = 'Password is required. Try again.';
        } else {
            havePatience($rootScope);
            $http(sessionRequest).
                success(function (data, status, headers, config) {
                    AccessLogService.log('info', 'Authenticated', data.first_name);
                    localStorage.setItem('DspUserId', data.id);
                    localStorage.setItem('DspEmail', body.email);
                    localStorage.setItem('DspPassword', body.password);
                    localStorage.setItem('DspRole', data.role);
                    localStorage.setItem('DspName', data.first_name);
                    localStorage.setItem('DspPatrolPrefix', data.last_name);
                    if (!localStorage.getItem('OnsIntroDone')) {
                        localStorage.setItem('OnsIntroDone', new Date());
                    }
                    $rootScope.hideTabs = false;
                    waitNoMore();
                    homeNavigator.resetToPage('home/home.html');
                }).
                error(function (data, status, headers, config) {
                    AccessLogService.log('warn', 'LoginErr', $scope.message);
                    $scope.message = niceMessage(data, status);
                    waitNoMore();
                });
        }
    };
    $scope.resetPassword = function () {
        var body = {
                email: $scope.email
            },
            passwordResetRequest = dspRequest('POST', '/user/password?reset=true', body);
        if (!$scope.email) {
            $scope.message = 'Email is required. Try again.';
        } else {
            havePatience($rootScope);
            $http(passwordResetRequest).
                success(function (data, status, headers, config) {
                    AccessLogService.log('info', 'LostPassword');
                    $scope.message = ('Check your email for a link to reset your password.');
                    localStorage.removeItem('DspPassword');
                    waitNoMore();
                }).
                error(function (data, status, headers, config) {
                    AccessLogService.log('error', 'LostPasswordErr', niceMessage(data, status));
                    $scope.message = niceMessage(data, status);
                    waitNoMore();
                });
        }
    };
    $scope.register = function () {
        homeNavigator.resetToPage('home/intro.html');
    };
    $scope.exit = function () {
        navigator.app.exitApp();
    };
    ons.ready(function () {
        return;
    });
});

/*
Decode CAIC rating.
*/
function decodeCaicRating(rating) {
    var description;
    switch (parseInt(rating, 10)) {
    case 5:
        description = 'Extreme';
        break;
    case 4:
        description = 'High';
        break;
    case 3:
        description = 'Considerable';
        break;
    case 2:
        description = 'Moderate';
        break;
    case 1:
        description = 'Low';
        break;
    default:
        description = 'Unknown';
    }
    return description;
}

/*
Summarize CAIC avy forecast.
*/
function summarizeCaicAvyForecast(data) {
    var now = moment(),
        today = moment(data.zones_array.date),
        rating = data.zones_array.rating,
        high = rating.substring(0, 1),
        middle = rating.substring(1, 2),
        low = rating.substring(2, 3),
        max = Math.max(high, middle, low),
        summary;
    if ((now.format('YYY-MM-DD') === today.format('YYY-MM-DD')) || (now.subtract(1, 'days').format('YYY-MM-DD') === today.format('YYY-MM-DD'))) {
        summary = decodeCaicRating(max) + ' danger';
        // if (data.zones_array.special_statement) {
        //     summary += ": " + data.zones_array.special_statement;
        // }
    } else {
        summary = 'No current forecast available';
    }
    return summary;
}

/*
Summarize lift status.
*/
function summarizeLiftStatus(data) {
    var liftCount = 0,
        runningLiftCount = 0,
        liftStatusSummary = '',
        i = 0,
        j = 0;
    for (i = 0; i < data.facilities.areas.area.length; i += 1) {
        if ('undefined' !== typeof data.facilities.areas.area[i].lifts) {
            if (data.facilities.areas.area[i].lifts.lift.constructor === Array) {
                for (j = 0; j < data.facilities.areas.area[i].lifts.lift.length; j += 1) {
                    if ('open' === data.facilities.areas.area[i].lifts.lift[j].status) {
                        runningLiftCount = runningLiftCount + 1;
                    }
                    liftCount = liftCount + 1;
                }
            } else {
                if ('open' === data.facilities.areas.area[i].lifts.lift.status) {
                    runningLiftCount = runningLiftCount + 1;
                }
                liftCount = liftCount + 1;
            }
        }
    }
    if (0 === runningLiftCount) {
        liftStatusSummary = 'No lifts running';
    } else {
        liftStatusSummary = runningLiftCount + ' lifts running';
    }
    return liftStatusSummary;
}

/*
Summarize trail status.
*/
function summarizeTrailStatus(data) {
    var trailCount = 0,
        openTrailCount = 0,
        areas = [],
        n = 0,
        i = 0,
        j = 0;
    for (i = 0; i < data.facilities.areas.area.length; i += 1) {
        if ('undefined' !== typeof data.facilities.areas.area[i].trails) {
            if (data.facilities.areas.area[i].trails.trail.constructor === Array) {
                for (j = 0; j < data.facilities.areas.area[i].trails.trail.length; j += 1) {
                    if ('open' === data.facilities.areas.area[i].trails.trail[j].status) {
                        openTrailCount = openTrailCount + 1;
                    }
                    trailCount = trailCount + 1;
                }
            } else {
                if ('open' === data.facilities.areas.area[i].trails.trail.status) {
                    openTrailCount = openTrailCount + 1;
                }
                trailCount = trailCount + 1;
            }
            areas[n] = {};
            data.facilities.areas.area[i].name = data.facilities.areas.area[i].name.replace(' Territory', '');
            areas[n].name = data.facilities.areas.area[i].name;
            if (0 === openTrailCount) {
                areas[n].trailsOpen = '- Closed';
            } else {
                areas[n].trailsOpen = '- ' + openTrailCount + ' trails open';
            }
            openTrailCount = 0;
            trailCount = 0;
            n = n + 1;
        }
    }
    return areas;
}

/*
Just to get the forecast once per session.
*/
var gotCaicForecast = false;

/*
Live feeds.
*/
module.controller('LiveController', function ($scope, $http, AccessLogService) {
    var patrolPrefix = localStorage.getItem('DspPatrolPrefix'),
        role = localStorage.getItem('DspRole'),
        patrol = angular.fromJson(localStorage.getItem('DspPatrol')),
        settings = angular.fromJson(localStorage.getItem('DspSetting')),
        settingRequest = dspRequest('GET', '/team/_table/Setting?order=name', null),
        territories = angular.fromJson(localStorage.getItem('DspTerritory')),
        territoryRequest = dspRequest('GET', '/team/_table/Territory?order=code', null),
        ads = angular.fromJson(localStorage.getItem('DspAd')),
        postRequest = dspRequest('GET', '/team/_table/Post?limit=1&order=postedOn%20desc', null),
        posts = angular.fromJson(localStorage.getItem('DspFirstPost')),
        myWeather2 = angular.fromJson(localStorage.getItem('DspMyWeather2')),
        openWeatherMap = angular.fromJson(localStorage.getItem('DspOpenWeatherMap')),
        openSnow = angular.fromJson(localStorage.getItem('DspOpenSnow')),
        caicForecast = angular.fromJson(localStorage.getItem('DspCaicForecast')),
        myWeather2Request = dspRequest('GET', '/myweather2?' + patrol.myWeather2Parms, null),
        openWeatherMapRequest = dspRequest('GET', '/openweathermap?lat=' + patrol.latitude + '&lon=' + patrol.longitude, null),
        openSnowRequest = dspRequest('GET', '/opensnow?' + patrol.openSnowParms, null),
        caicForecastRequest = dspRequest('POST', '/caic/getLatestForecastForSpecificZone.php', angular.fromJson(patrol.caicJson)),
        days = [],
        n = 0,
        i = 0,
        facilitiesData = angular.fromJson(localStorage.getItem('DspFacilities')),
        facilitiesRequest = dspRequest('GET', '/resort/' + patrolPrefix + '/facilities.json', null),
        liveCam = angular.fromJson(localStorage.getItem('DspLiveCam')),
        liveCamRequest = dspRequest('GET', '/team/_table/LiveCam', null),
        isMountainCam,
        mountainCamCount = 0,
        travelCamCount = 0;
    AccessLogService.log('info', 'Live');
    $http(territoryRequest).
        success(function (data, status, headers, config) {
            territories = data.resource;
            localStorage.setItem('DspTerritory', angular.toJson(territories));
        }).
        error(function (data, status, headers, config) {
            AccessLogService.log('error', 'GetTerritoryErr', niceMessage(data, status));
        });
    $scope.enableAd = false;
    if ('Basic' === role || 'Power' === role || 'Leader' === role) {
        $http(settingRequest).
            success(function (data, status, headers, config) {
                settings = data.resource;
                localStorage.setItem('DspSetting', angular.toJson(settings));
            }).
            error(function (data, status, headers, config) {
                AccessLogService.log('error', 'GetSettingErr', niceMessage(data, status));
            });
        if (posts && posts.length > 0) {
            for (i = 0; i < posts.length; i += 1) {
                posts[i].displayDate = moment(posts[i].postedOn).format('ddd, MMM D h:mmA');
            }
            if (posts[0].body.length > 25) {
                $scope.postsTeaser = posts[0].body.substring(0, 22) + '...';
            } else {
                $scope.postsTeaser = posts[0].body;
            }
        } else {
            $scope.postsTeaser = 'Be the first to post!';
        }
        $scope.enablePosting = true;
        postRequest.cache = false;
        $http(postRequest).
            success(function (data, status, headers, config) {
                posts = data.resource;
                localStorage.setItem('OnsPost', angular.toJson(posts));
                if (posts && posts.length > 0) {
                    for (i = 0; i < posts.length; i += 1) {
                        posts[i].displayDate = moment(posts[i].postedOn).format('ddd, MMM D h:mmA');
                    }
                    if (posts[0].body.length > 25) {
                        $scope.postsTeaser = posts[0].body.substring(0, 22) + '...';
                    } else {
                        $scope.postsTeaser = posts[0].body;
                    }
                } else {
                    $scope.postsTeaser = 'Be the first to post!';
                }
                $scope.enablePosting = true;
                localStorage.setItem('DspFirstPost', angular.toJson(posts));
            }).
            error(function (data, status, headers, config) {
                AccessLogService.log('error', 'GetPostErr', niceMessage(data, status));
            });
    } else {
        if (ads && ('Yes' === patrol.showAds)) {
            for (i = 0; i < ads.length; i += 1) {
                if ('home' === ads[i].slot) {
                    $scope.adImageAddress = ads[i].imageAddress;
                    $scope.adLinkAddress = ads[i].linkAddress;
                    $scope.enableAd = true;
                }
            }
        }
    }
    $scope.days = [];
    $scope.areas = [];
    if (myWeather2) {
        if (myWeather2.weather.snow_report[0].conditions.length > 25) {
            $scope.snowConditions = myWeather2.weather.snow_report[0].conditions.substring(0, 22) + '...';
        } else {
            $scope.snowConditions = myWeather2.weather.snow_report[0].conditions;
        }
    } else {
        $scope.hideSnowConditions = true;
    }
    if (openWeatherMap) {
        if ((openWeatherMap.main) && (openWeatherMap.main.temp)) {
            if ('USA' === patrol.country) {
                $scope.openWeather = Math.round(openWeatherMap.main.temp) + ' °F recently reported';
            } else {
                $scope.openWeather = Math.round((openWeatherMap.main.temp - 32) * 0.5556) + ' °C recently reported';
            }
        }
    }
    // Below line handy for testing
    // openSnow = angular.fromJson('{"location":{"meta":{"location_id":"16","snow_id":"303024","print_name":"Winter Park, CO","name":"Winter Park","shortname":"winterpark","state":"Colorado","shortstate":"CO","custom_forecast":"y","url":"http:\/\/opensnow.com\/location\/winterpark","icon_url":"http:\/\/opensnow.com\/img\/wxicons\/new\/"},"watch_warnings":{"item":[{"title":"Winter Storm Warning issued November 17 at 3:52AM MST until November 17 at 8:00AM MST","id":"263002","full":"...DANGEROUS BLIZZARD CONDITIONS SPREADING ACROSS THE PLAINS EAST OF DENVER... .A VERY STRONG WINTER STORM WILL MOVE ACROSS EASTERN COLORADO TODAY. AN AREA OF HEAVY SNOW HAS MOVED FROM THE MOUNTAINS ONTO THE WESTERN PORTION OF THE EASTERN COLORADO PLAINS...AND WILL MOVE SLOWLY EASTWARD THROUGH THE DAY. WITH VERY STRONG WINDS GUSTING UP TO 60 MPH ALREADY IN PLACE...BLIZZARD CONDITIONS WILL QUICKLY DEVELOP AS THE SNOW ACCUMULATES. THE HEAVY SNOW AND BLIZZARD CONDITIONS WILL BE SOUTH OF INTERSTATE 76. IN AREAS FURTHER NORTH THERE WILL BE MUCH LESS SNOW BUT STILL VERY STRONG WINDS. SNOW OVER THE EASTERN AND SOUTHERN SECTIONS OF THE DENVER METRO AREA WILL END BY MID MORNING...AND IN THE CASTLE ROCK AND KIOWA AREAS BY LATE MORNING. UNTIL THEN...THERE WILL BE HAZARDOUS DRIVING CONDITIONS WITH THE BLIZZARD CONTINUING IN ELBERT COUNTY THROUGH MUCH OF THE MORNING. THE WORST CONDITIONS WILL BE FROM ELBERT COUNTY EAST TOWARDS LIMON AND AKRON. SOME ROADS HAVE ALREADY BEEN CLOSED...AND ADDITIONAL ROAD CLOSURES ARE LIKELY DUE TO WHITEOUT CONDITIONS AND DRIFTING OF HEAVY SNOW. SOME PLACES WILL RECEIVE OVER A FOOT OF SNOW ALONG WITH WIND GUSTS TO 60 MPH. ...WINTER STORM WARNING REMAINS IN EFFECT UNTIL 8 AM MST THIS MORNING... * TIMING...SNOWFALL WILL DIMINISH EARLY THIS MORNING...WITH AREAS OF LIGHT SNOW THE REST OF THE DAY. * SNOW ACCUMULATIONS...ADDITIONAL ACCUMULATIONS OF 2 TO 4 INCHES...HEAVIEST IN THE FOOTHILLS SOUTHWEST OF DENVER. * WIND\/VISIBILITY...NORTHWEST WINDS AT 15 TO 25 MPH WITH GUSTS UP TO 40 MPH ARE LIKELY...WHICH WILL CAUSE AREAS OF BLOWING SNOW. * IMPACTS...WINTER DRIVING CONDITIONS CAN BE EXPECTED THIS MORNING...WITH THE WORST CONDITIONS IN AREAS WEST AND SOUTHWEST OF DENVER INCLUDING INTERSTATE 70 AND HIGHWAY 285."},{"title":"Winter Storm Warning issued November 16 at 8:19PM MST until November 17 at 8:00AM MST","id":"262924","full":"...DANGEROUS BLIZZARD OVER MUCH OF THE NORTHEAST AND EAST CENTRAL COLORADO PLAINS TONIGHT INTO TUESDAY... ...TRAVEL NOT RECOMMENDED AND MAY BECOME IMPOSSIBLE ON THE PLAINS... ...HEAVY SNOW IN THE MOUNTAINS... .A VERY STRONG WINTER STORM WILL MOVE ACROSS COLORADO TONIGHT AND INTO WESTERN KANSAS BY TUESDAY AFTERNOON. THE STORM WILL PRODUCE HEAVY SNOW IN THE MOUNTAINS...AND BLIZZARD CONDITIONS ON THE PLAINS WHERE THE HEAVIER SNOW FALLS SOUTH OF INTERSTATE 76. CONDITIONS WILL DETERIORATE ALONG THE FRONT RANGE I-25 CORRIDOR THROUGH THIS EVENING...WITH BLIZZARD CONDITIONS DEVELOPING ON THE PLAINS AS WINDS STRENGTHEN AND SNOW SPREADS EAST OVERNIGHT. SLOW IMPROVEMENT FROM WEST TO EAST WILL OCCUR DURING THE DAY TUESDAY. THE WORST CONDITIONS ARE EXPECTED TO OCCUR FROM THE PALMER DIVIDE AND EASTERN AND SOUTHERN SECTIONS OF THE DENVER METRO AREA EAST TOWARDS LIMON AND AKRON. IN THESE AREAS ROAD CLOSURES ARE LIKELY DUE TO WHITEOUT CONDITIONS AND DRIFTING OF HEAVY SNOW. SOME PLACES WILL RECEIVE WELL OVER A FOOT OF SNOW ALONG WITH WIND GUSTS TO AROUND 50 MPH. IN AREAS NORTH OF INTERSTATE 76 SNOWFALL WILL BE LIGHTER...BUT STRONG NORTHERLY WINDS WILL STILL LIKELY PRODUCE EXTENSIVE BLOWING AND DRIFTING SNOW AND HAZARDOUS DRIVING CONDITIONS. ...WINTER STORM WARNING REMAINS IN EFFECT UNTIL 8 AM MST TUESDAY... * TIMING...MODERATE TO HEAVY SNOWFALL WILL CONTINUE OVERNIGHT OVER THE FRONT RANGE MOUNTAINS. SNOWFALL IS EXPECTED TO DIMINISH FROM WEST TO EAST DURING THE DAY TUESDAY. * SNOW ACCUMULATIONS...8 TO 16 INCHES. * WIND\/VISIBILITY...NORTHWEST WINDS AT 15 TO 25 MPH WITH GUSTS UP TO 40 MPH ARE LIKELY...WHICH WILL CAUSE AREAS OF BLOWING SNOW AND VISIBILITY RESTRICTIONS TO LESS THAN A QUARTER MILE AT TIMES. * IMPACTS...TRAVEL WILL BE DIFFICULT AT TIMES DUE TO HEAVY SNOWFALL ACCUMULATIONS ON ROADWAYS AND POOR VISIBILITIES IN BLOWING SNOW. PASSES MAY CLOSE AT TIMES DUE TO HEAVY SNOWFALL... POOR DRIVING CONDITIONS...AND ACCIDENTS."},{"title":"Winter Storm Warning issued November 16 at 3:23PM MST until November 17 at 8:00AM MST","id":"262851","full":"...DANGEROUS BLIZZARD OVER MOST OF THE NORTHEAST AND EAST CENTRAL COLORADO PLAINS TONIGHT INTO TUESDAY... ...TRAVEL NOT RECOMMENDED AND MAY BECOME IMPOSSIBLE ON THE PLAINS... ...HEAVY SNOW IN THE MOUNTAINS... .A VERY STRONG WINTER STORM WILL MOVE ACROSS COLORADO TONIGHT AND INTO WESTERN KANSAS BY TUESDAY AFTERNOON. THE STORM WILL PRODUCE HEAVY SNOW IN THE MOUNTAINS AND THEN SNOW...AND VERY STRONG WINDS ON THE PLAINS. BLIZZARD CONDITIONS WILL DEVELOP OVER A MAJORITY OF THE PLAINS TONIGHT...WITH THE WORST CONDITIONS ROUGHLY ALONG AND SOUTH OF INTERSTATE 76 TONIGHT. CONDITIONS WILL DETERIORATE ALONG THE FRONT RANGE I-25 CORRIDOR THROUGH THIS EVENING...WITH BLIZZARD CONDITIONS DEVELOPING AS WINDS STRENGTHEN. THE BLIZZARD WILL SPREAD EAST ACROSS THE PLAINS THROUGH LATE EVENING. SLOW IMPROVEMENT FROM WEST TO EAST WILL OCCUR DURING THE DAY TUESDAY. THE WORST CONDITIONS ARE EXPECTED TO OCCUR FROM THE SOUTHERN AND EASTERN SECTIONS OF THE DENVER METRO AREA EAST TOWARDS LIMON AND AKRON. IN THESE AREAS ROAD CLOSURES ARE LIKELY DUE TO WHITEOUT CONDITIONS AND DRIFTING OF HEAVY SNOW. SOME PLACES WILL RECEIVE WELL OVER A FOOT OF SNOW ALONG WITH WIND GUSTS TO AROUND 55 MPH. IN AREAS NORTH OF INTERSTATE 76 SNOWFALL WILL BE LIGHTER...BUT STRONG NORTHERLY WINDS WILL STILL LIKELY PRODUCE EXTENSIVE BLOWING AND DRIFTING SNOW AND HAZARDOUS DRIVING CONDITIONS. ...WINTER STORM WARNING REMAINS IN EFFECT UNTIL 8 AM MST TUESDAY... * TIMING...MODERATE TO HEAVY SNOWFALL WILL CONTINUE OVERNIGHT OVER THE FRONT RANGE MOUNTAINS. SNOWFALL IS EXPECTED TO DIMINISH FROM WEST TO EAST DURING THE DAY TUESDAY. * SNOW ACCUMULATIONS...10 TO 20 INCHES OF SNOW ACCUMULATION IS LIKELY BY EARLY TUESDAY AFTERNOON. * WIND\/VISIBILITY...NORTHWEST WINDS AT 15 TO 25 MPH WITH GUSTS UP TO 40 MPH ARE LIKELY...WHICH WILL CAUSE AREAS OF BLOWING SNOW AND VISIBILITY RESTRICTIONS TO LESS THAN A QUARTER MILE AT TIMES. * IMPACTS...TRAVEL WILL BE DIFFICULT AT TIMES DUE TO HEAVY SNOWFALL ACCUMULATIONS ON ROADWAYS AND POOR VISIBILITIES IN BLOWING SNOW. PASSES MAY CLOSE AT TIMES DUE TO HEAVY SNOWFALL... POOR DRIVING CONDITIONS...AND ACCIDENTS."},{"title":"Winter Storm Warning issued November 16 at 10:27AM MST until November 17 at 8:00AM MST","id":"262764","full":"...STORM BRINGING HEAVY SNOW TO PORTIONS OF THE HIGH COUNTRY AND BLIZZARD CONDITIONS TO MUCH OF NORTHEAST COLORADO TONIGHT AND TUESDAY... .A STRONG WINTER STORM WILL MOVE ACROSS COLORADO TONIGHT AND INTO WESTERN KANSAS BY TUESDAY AFTERNOON. THE STORM IS LIKELY TO PRODUCE HEAVY SNOW IN THE MOUNTAINS AND THEN SNOW...AND VERY STRONG WINDS ON THE PLAINS. BLIZZARD CONDITIONS WILL DEVELOP IN AREAS ROUGHLY ALONG AND SOUTH OF INTERSTATE 76 TONIGHT...WITH CONDITIONS SLOWLY IMPROVING FROM WEST TO EAST DURING THE DAY TUESDAY. WINTER TRAVEL CONDITIONS CAN BE EXPECTED TO QUICKLY DETERIORATE IN THE MOUNTAINS THIS AFTERNOON AND ON THE HIGH PLAINS THIS EVENING. THE WORST CONDITIONS ARE EXPECTED TO OCCUR FROM THE SOUTHERN AND EASTERN SECTIONS OF THE DENVER METRO AREA EAST TOWARDS LIMON AND AKRON. IN THESE AREAS ROAD CLOSURES ARE LIKELY DUE TO WHITEOUT CONDITIONS AND DRIFTING OF HEAVY SNOW. SOME PLACES MAY RECEIVE OVER A FOOT OF SNOW ALONG WITH WIND GUSTS TO AROUND 55 MPH. IN AREAS NORTH OF INTERSTATE 76 SNOWFALL WILL BE LIGHTER...BUT STRONG NORTHERLY WINDS WILL STILL LIKELY PRODUCE EXTENSIVE BLOWING AND DRIFTING SNOW AND HAZARDOUS DRIVING CONDITIONS. ...WINTER STORM WARNING REMAINS IN EFFECT UNTIL 8 AM MST TUESDAY... * TIMING...MODERATE TO HEAVY SNOWFALL WILL BECOME WIDESPREAD IN MOUNTAIN AREA BY THIS AFTERNOON AND CONTINUE OVERNIGHT OVER THE FRONT RANGE MOUNTAINS. SNOWFALL IS EXPECTED TO DIMINISH FROM WEST TO EAST DURING THE DAY TUESDAY. * SNOW ACCUMULATIONS...10 TO 20 INCHES OF SNOW ACCUMULATION IS LIKELY BY EARLY TUESDAY AFTERNOON. * WIND\/VISIBILITY...NORTHWEST WINDS AT 15 TO 25 MPH WITH GUSTS UP TO 40 MPH ARE LIKELY...WHICH WILL CAUSE AREAS OF BLOWING SNOW AND VISIBILITY RESTRICTIONS TO LESS THAN A HALF MILE AT TIMES. * IMPACTS...TRAVEL MAY BECOME DIFFICULT AT TIMES DUE TO HEAVY SNOWFALL ACCUMULATIONS ON ROADWAYS AND POOR VISIBILITIES IN BLOWING SNOW. PASSES MAY CLOSE AT TIMES DUE TO HEAVY SNOWFALL... POOR DRIVING CONDITIONS AND ACCIDENTS."},{"title":"Winter Storm Warning issued November 16 at 5:57AM MST until November 17 at 8:00AM MST","id":"262744","full":"...BLIZZARD CONDITIONS ACROSS MUCH OF THE NORTHEAST COLORADO PLAINS TONIGHT AND TUESDAY WITH AREAS OF HEAVY SNOW IN THE MOUNTAINS... .A STRONG WINTER STORM WILL MOVE ACROSS COLORADO TONIGHT AND INTO WESTERN KANSAS BY TUESDAY AFTERNOON. THE STORM WILL PRODUCE HEAVY SNOW IN THE MOUNTAINS AND THEN SNOW...AND VERY STRONG WINDS ON THE PLAINS. BLIZZARD CONDITIONS WILL DEVELOP IN AREAS ROUGHLY ALONG AND SOUTH OF INTERSTATE 76 LATE TONIGHT...WITH CONDITIONS IMPROVING FROM WEST TO EAST DURING THE DAY TUESDAY. WINTER TRAVEL CONDITIONS CAN BE EXPECTED IN THE MOUNTAINS BY THIS AFTERNOON. THE WORST CONDITIONS ARE EXPECTED TO OCCUR FROM THE SOUTHERN AND EASTERN SECTIONS OF THE DENVER METRO AREA EAST TOWARDS LIMON AND AKRON. IN THESE AREAS ROAD CLOSURES ARE LIKELY DUE TO WHITEOUT CONDITIONS AND DRIFTING OF HEAVY SNOW. SOME PLACES MAY RECEIVE OVER A FOOT OF SNOW ALONG WITH WIND GUSTS TO 60 MPH. IN AREAS NORTH OF INTERSTATE 76 THE SNOW WILL BE LIGHTER...BUT THE STRONG WINDS WILL STILL CAUSE EXTENSIVE BLOWING AND DRIFTING SNOW AND HAZARDOUS DRIVING CONDITIONS. ...WINTER STORM WARNING IN EFFECT FROM 11 AM THIS MORNING TO 8 AM MST TUESDAY... THE NATIONAL WEATHER SERVICE IN DENVER HAS ISSUED A WINTER STORM WARNING FOR HEAVY SNOW...WHICH IS IN EFFECT FROM 11 AM THIS MORNING TO 8 AM MST TUESDAY. THE WINTER STORM WATCH IS NO LONGER IN EFFECT. * TIMING...SNOW WILL DEVELOP BY EARLY AFTERNOON AND THEN BECOME HEAVY AT TIMES OVERNIGHT. SNOW WILL BEGIN DIMINISHING BY MIDDAY TUESDAY. * SNOW ACCUMULATIONS...10 TO 20 INCHES OF NEW SNOW WILL BE POSSIBLE BY TUESDAY AFTERNOON. * WIND\/VISIBILITY...NORTHWEST WINDS AT 15 TO 25 MPH WITH GUSTS UP TO 40 MPH WILL BE POSSIBLE...CAUSING SOME BLOWING SNOW AND VISIBILITIES RESTRICTED TO A HALF MILE OR LESS AT TIMES. * IMPACTS...TRAVEL MAY BECOME DIFFICULT AT TIMES DUE TO HEAVY SNOWFALL ACCUMULATIONS ON ROADWAYS AND POOR VISIBILITIES IN BLOWING SNOW."},{"title":"Winter Storm Watch issued November 15 at 9:32PM MST until November 17 at 8:00AM MST","id":"262658","full":"...POWERFUL WINTER STORM MOVING INTO COLORADO MONDAY AND MONDAY NIGHT... .A POTENT WINTER STORM IS EXPECTED TO MOVE ACROSS COLORADO MONDAY NIGHT WHICH WILL PRODUCE HEAVY SNOW IN THE MOUNTAINS AND THEN SNOW...STRONG GUSTY WINDS...AND A POSSIBLE BLIZZARD ON THE PLAINS MONDAY NIGHT AND TUESDAY MORNING. THE HEAVY SNOW FALLING IN THE MOUNTAINS WILL MAKE TRAVEL CONDITIONS DIFFICULT DUE TO SNOW COVERED ROADWAYS MONDAY NIGHT AND TUESDAY MORNING. ON THE PLAINS...AS THE SNOW BEGINS FALLING AND NORTHERLY WINDS BECOME STRONG AND GUSTY...BLIZZARD CONDITIONS MAY DEVELOP MAKING TRAVEL DIFFICULT IF NOT IMPOSSIBLE. THE WORST CONDITIONS ARE EXPECTED TO OCCUR FROM THE EASTERN SECTIONS OF THE DENVER METRO AREA EAST AND NORTHEAST ACROSS THE PLAINS OF COLORADO. ...WINTER STORM WATCH REMAINS IN EFFECT FROM 8 AM MST MONDAY THROUGH TUESDAY MORNING... * TIMING...SNOW IS EXPECTED TO BEGIN FALLING IN THE NORTH CENTRAL COLORADO MOUNTAINS MONDAY MORNING AND THEN BECOME HEAVY AT TIMES MONDAY AFTERNOON AND NIGHT. SNOW WILL BEGIN DIMINISHING BY MIDDAY TUESDAY. * SNOW ACCUMULATIONS...6 TO 14 INCHES OF NEW SNOW WILL BE POSSIBLE BY TUESDAY AFTERNOON. * WIND\/VISIBILITY...NORTHWEST WINDS AT 15 TO 25 MPH WITH GUSTS UP TO 35 MPH WILL BE POSSIBLE...CAUSING SOME BLOWING SNOW AND VISIBILITIES RESTRICTED TO A HALF MILE OR LESS AT TIMES. * IMPACTS...TRAVEL MAY BECOME DIFFICULT AT TIMES DUE TO HEAVY SNOWFALL ACCUMULATIONS ON ROADWAYS AND POOR VISIBILITIES IN BLOWING SNOW."},{"title":"Winter Storm Watch issued November 15 at 3:36PM MST until November 17 at 8:00AM MST","id":"262590","full":"...STRONG WINTER STORM MOVING OVER COLORADO MONDAY NIGHT... .A POTENT WINTER STORM IS EXPECTED TO MOVE ACROSS COLORADO MONDAY NIGHT WHICH WILL PRODUCE HEAVY SNOW IN THE MOUNTAINS AND THEN SNOW AND GUSTY WINDS ON THE PLAINS BY TUESDAY MORNING. THE HEAVY SNOW FALLING IN THE MOUNTAINS WILL MAKE TRAVEL CONDITIONS DIFFICULT DUE TO SNOW COVERED ROADWAYS MONDAY NIGHT AND TUESDAY MORNING. ON THE PLAINS...AS THE SNOW BEGINS FALLING AND NORTHERLY WINDS INCREASE...IT IS POSSIBLE THAT AREAS OF BLOWING AND DRIFTING SNOW WILL MAKE TRAVEL DIFFICULT DUE TO POOR VISIBILITIES AND SNOW COVERED ROADS. ...WINTER STORM WATCH IN EFFECT FROM MONDAY MORNING THROUGH TUESDAY MORNING... THE NATIONAL WEATHER SERVICE IN DENVER HAS ISSUED A WINTER STORM WATCH...WHICH IS IN EFFECT FROM MONDAY MORNING THROUGH TUESDAY MORNING. * TIMING...SNOW IS EXPECTED TO BEGIN FALLING IN THE NORTH CENTRAL COLORADO MOUNTAINS LATE MONDAY MORNING AND THEN BECOME HEAVY AT TIMES MONDAY NIGHT. SNOW WILL BEGIN DIMINISHING BY MIDDAY TUESDAY. * SNOW ACCUMULATIONS...8 TO 16 INCHES OF NEW SNOW WILL BE POSSIBLE BY TUESDAY AFTERNOON. LOCALLY HIGHER AMOUNTS WILL ALSO BE POSSIBLE. * WIND\/VISIBILITY...NORTHWEST WINDS AT 15 TO 25 MPH WITH GUSTS UP TO 35 MPH WILL BE POSSIBLE...CAUSING SOME BLOWING SNOW AND VISIBILITIES RESTRICTED TO A HALF MILE OR LESS AT TIMES. * IMPACTS...TRAVEL MAY BECOME DIFFICULT AT TIMES DUE TO HEAVY SNOWFALL ACCUMULATIONS ON ROADWAYS AND POOR VISIBILITIES IN BLOWING SNOW."}]},"current_conditions":{"temp":"8","wind_dir":"N","wind_speed":"24","location":"Located Nearby","updated_at":"2015-11-17 14:00:00"},"forecast":{"updated_at":"2015-11-17 13:13:11","period":[{"date":"2015-11-17","dow":"Tuesday","day":{"snow":"1-3","weather":"Snow","wind_dir":"W","wind_speed":"Gusts to 30-40mph","temp":"24","icon":"sn.png"},"night":{"snow":"1-3","weather":"Snow and Blustery","wind_dir":"W","wind_speed":"Gusts to 40-50mph","temp":"12","icon":"nsn.png"}},{"date":"2015-11-18","dow":"Wednesday","day":{"snow":"1-3","weather":"Snow Likely and Areas Blowing Snow","wind_dir":"W","wind_speed":"Gusts to 50-60mph","temp":"19","icon":"sn.png"},"night":{"snow":"0-1","weather":"Chance Snow Showers and Breezy","wind_dir":"W","wind_speed":"Gusts to 40-50mph","temp":"15","icon":"nsn.png"}},{"date":"2015-11-19","dow":"Thursday","day":{"snow":"0","weather":"Chance Snow Showers and Windy","wind_dir":"W","wind_speed":"Gusts to 30-40mph","temp":"29","icon":"sn.png"},"night":{"snow":"0-1","weather":"Slight Chance Snow Showers and Windy","wind_dir":"W","wind_speed":"Gusts to 30-40mph","temp":"21","icon":"nsn.png"}},{"date":"2015-11-20","dow":"Friday","day":{"snow":"1-3","weather":"Mostly Sunny and Breezy","wind_dir":"W","wind_speed":"Gusts to 50-60mph","temp":"32","icon":"wind_sct.png"},"night":{"snow":"0-1","weather":"Slight Chance Snow Showers and Breezy","wind_dir":"W","wind_speed":"Gusts to 30-40mph","temp":"21","icon":"nsn.png"}},{"date":"2015-11-21","dow":"Saturday","day":{"snow":"0","weather":"Slight Chance Snow Showers and Breezy","wind_dir":"W","wind_speed":"Gusts to 20-30mph","temp":"33","icon":"sn.png"},"night":{"snow":"0","weather":"Slight Chance Snow Showers","wind_dir":"W","wind_speed":"Gusts to 20-30mph","temp":"18","icon":"nsn.png"}}]}}}');
    if (openSnow) {
        if ((openSnow.location.watch_warnings) && (openSnow.location.watch_warnings.item) && (openSnow.location.watch_warnings.item.length > 0)) {
            if (openSnow.location.watch_warnings.item[0].title.length > 25) {
                $scope.warningsTeaser = openSnow.location.watch_warnings.item[0].title.substring(0, 22) + '...';
            } else {
                $scope.warningsTeaser = openSnow.location.watch_warnings.item[0].title;
            }
        }
        /*
        if ((openSnow.location) && (openSnow.location.current_conditions)) {
            $scope.currentWeather = openSnow.location.current_conditions.temp + '° recently reported';
            $scope.openWeather = null;
        }
        */
        for (i = 0; i < openSnow.location.forecast.period.length; i += 1) {
            if ('0' !== openSnow.location.forecast.period[i].day.snow) {
                days[n] = {};
                if ('USA' === patrol.country) {
                    days[n].forecast = openSnow.location.forecast.period[i].dow + ' Daytime - ' + openSnow.location.forecast.period[i].day.snow + '"';
                } else {
                    if (openSnow.location.forecast.period[i].day.snow.indexOf('-') > 0) {
                        days[n].forecast = openSnow.location.forecast.period[i].dow + ' Daytime - ' +
                            2 * Math.round(1.27 * Number(openSnow.location.forecast.period[i].day.snow.split('-')[0])) + ' - ' +
                            2 * Math.round(1.27 * Number(openSnow.location.forecast.period[i].day.snow.split('-')[1])) + ' cm';
                    } else {
                        days[n].forecast = openSnow.location.forecast.period[i].dow + ' Daytime - ' +
                            2 * Math.round(1.27 * Number(openSnow.location.forecast.period[i].day.snow)) + ' cm';
                    }
                }
                n = n + 1;
            }
            if ('0' !== openSnow.location.forecast.period[i].night.snow) {
                days[n] = {};
                if ('USA' === patrol.country) {
                    days[n].forecast = openSnow.location.forecast.period[i].dow + ' Overnight - ' + openSnow.location.forecast.period[i].night.snow + '"';
                } else {
                    if (openSnow.location.forecast.period[i].night.snow.indexOf('-') > 0) {
                        days[n].forecast = openSnow.location.forecast.period[i].dow + ' Overnight - ' +
                            2 * Math.round(1.27 * Number(openSnow.location.forecast.period[i].night.snow.split('-')[0])) + ' - ' +
                            2 * Math.round(1.27 * Number(openSnow.location.forecast.period[i].night.snow.split('-')[1])) + ' cm';
                    } else {
                        days[n].forecast = openSnow.location.forecast.period[i].dow + ' Overnight - ' +
                            2 * Math.round(1.27 * Number(openSnow.location.forecast.period[i].day.snow)) + ' cm';
                    }
                }
                n = n + 1;
            }
        }
        if (0 === n) {
            days[0] = {};
            days[0].forecast = 'No snow in the forecast';
        }
        $scope.days = days;
    } else {
        $scope.currentWeather = 'Currently unavailable';
        $scope.days[0] = {};
        $scope.days[0].forecast = 'Currently unavailable';
    }
    if (caicForecast) {
        $scope.avyForecast = summarizeCaicAvyForecast(caicForecast);
    }
    if (facilitiesData) {
        $scope.liftsRunning = summarizeLiftStatus(facilitiesData);
        $scope.areas = summarizeTrailStatus(facilitiesData);
    } else {
        $scope.liftsRunning = 'Currently unavailable';
        $scope.areas[0] = {};
        $scope.areas[0].trailsOpen = 'Currently unavailable';
    }
    if (liveCam && territories) {
        mountainCamCount = 0;
        travelCamCount = 0;
        for (i = 0; i < liveCam.length; i += 1) {
            isMountainCam = false;
            for (n = 0; n < territories.length; n += 1) {
                if (liveCam[i].territory === territories[n].code) {
                    if (territories[n].onResort === 'Yes') {
                        isMountainCam = true;
                    }
                }
            }
            if (isMountainCam) {
                mountainCamCount += 1;
            } else {
                travelCamCount += 1;
            }
        }
        if (mountainCamCount > 0) {
            $scope.liveCams = mountainCamCount + ' mountain cams';                
        } else {
            $scope.liveCams = null;
        }
        if (travelCamCount > 0) {
            $scope.travelCams = travelCamCount + ' travel cams';                
        } else {
            $scope.travelCams = null;
        }
    } else {
        $scope.liveCams = null;
        $scope.travelCams = null;
    }
    if (patrol.myWeather2Parms) {
        $http(myWeather2Request).
            success(function (data, status, headers, config) {
                if (data.weather.snow_report[0].conditions.length > 25) {
                    $scope.snowConditions = data.weather.snow_report[0].conditions.substring(0, 22) + '...';
                } else {
                    $scope.snowConditions = data.weather.snow_report[0].conditions;
                }
                localStorage.setItem('DspMyWeather2', angular.toJson(data));
            }).
            error(function (data, status, headers, config) {
                AccessLogService.log('error', 'GetMyWeather2Err', niceMessage(data, status));
            });
    } else {
        $scope.hideSnowConditions = true;
    }
    if ((patrol.latitude) && (patrol.longitude)) {
        $http(openWeatherMapRequest).
            success(function (data, status, headers, config) {
                if ((data.main) && (data.main.temp)) {
                    if ('USA' === patrol.country) {
                        $scope.openWeather = Math.round(data.main.temp) + ' °F recently reported';
                    } else {
                        $scope.openWeather = Math.round((data.main.temp - 32) * 0.5556) + ' °C recently reported';
                    }
                }
                localStorage.setItem('DspOpenWeatherMap', angular.toJson(data));
            }).
            error(function (data, status, headers, config) {
                AccessLogService.log('error', 'GetOpenWeatherMapErr', niceMessage(data, status));
            });
    }
    if (patrol.openSnowParms) {
        $http(openSnowRequest).
            success(function (data, status, headers, config) {
                var i = 0,
                    n = 0,
                    days = [];
                // Below line handy for testing
                // data = angular.fromJson('{"location":{"meta":{"location_id":"16","snow_id":"303024","print_name":"Winter Park, CO","name":"Winter Park","shortname":"winterpark","state":"Colorado","shortstate":"CO","custom_forecast":"y","url":"http:\/\/opensnow.com\/location\/winterpark","icon_url":"http:\/\/opensnow.com\/img\/wxicons\/new\/"},"watch_warnings":{"item":[{"title":"Winter Storm Warning issued November 17 at 3:52AM MST until November 17 at 8:00AM MST","id":"263002","full":"...DANGEROUS BLIZZARD CONDITIONS SPREADING ACROSS THE PLAINS EAST OF DENVER... .A VERY STRONG WINTER STORM WILL MOVE ACROSS EASTERN COLORADO TODAY. AN AREA OF HEAVY SNOW HAS MOVED FROM THE MOUNTAINS ONTO THE WESTERN PORTION OF THE EASTERN COLORADO PLAINS...AND WILL MOVE SLOWLY EASTWARD THROUGH THE DAY. WITH VERY STRONG WINDS GUSTING UP TO 60 MPH ALREADY IN PLACE...BLIZZARD CONDITIONS WILL QUICKLY DEVELOP AS THE SNOW ACCUMULATES. THE HEAVY SNOW AND BLIZZARD CONDITIONS WILL BE SOUTH OF INTERSTATE 76. IN AREAS FURTHER NORTH THERE WILL BE MUCH LESS SNOW BUT STILL VERY STRONG WINDS. SNOW OVER THE EASTERN AND SOUTHERN SECTIONS OF THE DENVER METRO AREA WILL END BY MID MORNING...AND IN THE CASTLE ROCK AND KIOWA AREAS BY LATE MORNING. UNTIL THEN...THERE WILL BE HAZARDOUS DRIVING CONDITIONS WITH THE BLIZZARD CONTINUING IN ELBERT COUNTY THROUGH MUCH OF THE MORNING. THE WORST CONDITIONS WILL BE FROM ELBERT COUNTY EAST TOWARDS LIMON AND AKRON. SOME ROADS HAVE ALREADY BEEN CLOSED...AND ADDITIONAL ROAD CLOSURES ARE LIKELY DUE TO WHITEOUT CONDITIONS AND DRIFTING OF HEAVY SNOW. SOME PLACES WILL RECEIVE OVER A FOOT OF SNOW ALONG WITH WIND GUSTS TO 60 MPH. ...WINTER STORM WARNING REMAINS IN EFFECT UNTIL 8 AM MST THIS MORNING... * TIMING...SNOWFALL WILL DIMINISH EARLY THIS MORNING...WITH AREAS OF LIGHT SNOW THE REST OF THE DAY. * SNOW ACCUMULATIONS...ADDITIONAL ACCUMULATIONS OF 2 TO 4 INCHES...HEAVIEST IN THE FOOTHILLS SOUTHWEST OF DENVER. * WIND\/VISIBILITY...NORTHWEST WINDS AT 15 TO 25 MPH WITH GUSTS UP TO 40 MPH ARE LIKELY...WHICH WILL CAUSE AREAS OF BLOWING SNOW. * IMPACTS...WINTER DRIVING CONDITIONS CAN BE EXPECTED THIS MORNING...WITH THE WORST CONDITIONS IN AREAS WEST AND SOUTHWEST OF DENVER INCLUDING INTERSTATE 70 AND HIGHWAY 285."},{"title":"Winter Storm Warning issued November 16 at 8:19PM MST until November 17 at 8:00AM MST","id":"262924","full":"...DANGEROUS BLIZZARD OVER MUCH OF THE NORTHEAST AND EAST CENTRAL COLORADO PLAINS TONIGHT INTO TUESDAY... ...TRAVEL NOT RECOMMENDED AND MAY BECOME IMPOSSIBLE ON THE PLAINS... ...HEAVY SNOW IN THE MOUNTAINS... .A VERY STRONG WINTER STORM WILL MOVE ACROSS COLORADO TONIGHT AND INTO WESTERN KANSAS BY TUESDAY AFTERNOON. THE STORM WILL PRODUCE HEAVY SNOW IN THE MOUNTAINS...AND BLIZZARD CONDITIONS ON THE PLAINS WHERE THE HEAVIER SNOW FALLS SOUTH OF INTERSTATE 76. CONDITIONS WILL DETERIORATE ALONG THE FRONT RANGE I-25 CORRIDOR THROUGH THIS EVENING...WITH BLIZZARD CONDITIONS DEVELOPING ON THE PLAINS AS WINDS STRENGTHEN AND SNOW SPREADS EAST OVERNIGHT. SLOW IMPROVEMENT FROM WEST TO EAST WILL OCCUR DURING THE DAY TUESDAY. THE WORST CONDITIONS ARE EXPECTED TO OCCUR FROM THE PALMER DIVIDE AND EASTERN AND SOUTHERN SECTIONS OF THE DENVER METRO AREA EAST TOWARDS LIMON AND AKRON. IN THESE AREAS ROAD CLOSURES ARE LIKELY DUE TO WHITEOUT CONDITIONS AND DRIFTING OF HEAVY SNOW. SOME PLACES WILL RECEIVE WELL OVER A FOOT OF SNOW ALONG WITH WIND GUSTS TO AROUND 50 MPH. IN AREAS NORTH OF INTERSTATE 76 SNOWFALL WILL BE LIGHTER...BUT STRONG NORTHERLY WINDS WILL STILL LIKELY PRODUCE EXTENSIVE BLOWING AND DRIFTING SNOW AND HAZARDOUS DRIVING CONDITIONS. ...WINTER STORM WARNING REMAINS IN EFFECT UNTIL 8 AM MST TUESDAY... * TIMING...MODERATE TO HEAVY SNOWFALL WILL CONTINUE OVERNIGHT OVER THE FRONT RANGE MOUNTAINS. SNOWFALL IS EXPECTED TO DIMINISH FROM WEST TO EAST DURING THE DAY TUESDAY. * SNOW ACCUMULATIONS...8 TO 16 INCHES. * WIND\/VISIBILITY...NORTHWEST WINDS AT 15 TO 25 MPH WITH GUSTS UP TO 40 MPH ARE LIKELY...WHICH WILL CAUSE AREAS OF BLOWING SNOW AND VISIBILITY RESTRICTIONS TO LESS THAN A QUARTER MILE AT TIMES. * IMPACTS...TRAVEL WILL BE DIFFICULT AT TIMES DUE TO HEAVY SNOWFALL ACCUMULATIONS ON ROADWAYS AND POOR VISIBILITIES IN BLOWING SNOW. PASSES MAY CLOSE AT TIMES DUE TO HEAVY SNOWFALL... POOR DRIVING CONDITIONS...AND ACCIDENTS."},{"title":"Winter Storm Warning issued November 16 at 3:23PM MST until November 17 at 8:00AM MST","id":"262851","full":"...DANGEROUS BLIZZARD OVER MOST OF THE NORTHEAST AND EAST CENTRAL COLORADO PLAINS TONIGHT INTO TUESDAY... ...TRAVEL NOT RECOMMENDED AND MAY BECOME IMPOSSIBLE ON THE PLAINS... ...HEAVY SNOW IN THE MOUNTAINS... .A VERY STRONG WINTER STORM WILL MOVE ACROSS COLORADO TONIGHT AND INTO WESTERN KANSAS BY TUESDAY AFTERNOON. THE STORM WILL PRODUCE HEAVY SNOW IN THE MOUNTAINS AND THEN SNOW...AND VERY STRONG WINDS ON THE PLAINS. BLIZZARD CONDITIONS WILL DEVELOP OVER A MAJORITY OF THE PLAINS TONIGHT...WITH THE WORST CONDITIONS ROUGHLY ALONG AND SOUTH OF INTERSTATE 76 TONIGHT. CONDITIONS WILL DETERIORATE ALONG THE FRONT RANGE I-25 CORRIDOR THROUGH THIS EVENING...WITH BLIZZARD CONDITIONS DEVELOPING AS WINDS STRENGTHEN. THE BLIZZARD WILL SPREAD EAST ACROSS THE PLAINS THROUGH LATE EVENING. SLOW IMPROVEMENT FROM WEST TO EAST WILL OCCUR DURING THE DAY TUESDAY. THE WORST CONDITIONS ARE EXPECTED TO OCCUR FROM THE SOUTHERN AND EASTERN SECTIONS OF THE DENVER METRO AREA EAST TOWARDS LIMON AND AKRON. IN THESE AREAS ROAD CLOSURES ARE LIKELY DUE TO WHITEOUT CONDITIONS AND DRIFTING OF HEAVY SNOW. SOME PLACES WILL RECEIVE WELL OVER A FOOT OF SNOW ALONG WITH WIND GUSTS TO AROUND 55 MPH. IN AREAS NORTH OF INTERSTATE 76 SNOWFALL WILL BE LIGHTER...BUT STRONG NORTHERLY WINDS WILL STILL LIKELY PRODUCE EXTENSIVE BLOWING AND DRIFTING SNOW AND HAZARDOUS DRIVING CONDITIONS. ...WINTER STORM WARNING REMAINS IN EFFECT UNTIL 8 AM MST TUESDAY... * TIMING...MODERATE TO HEAVY SNOWFALL WILL CONTINUE OVERNIGHT OVER THE FRONT RANGE MOUNTAINS. SNOWFALL IS EXPECTED TO DIMINISH FROM WEST TO EAST DURING THE DAY TUESDAY. * SNOW ACCUMULATIONS...10 TO 20 INCHES OF SNOW ACCUMULATION IS LIKELY BY EARLY TUESDAY AFTERNOON. * WIND\/VISIBILITY...NORTHWEST WINDS AT 15 TO 25 MPH WITH GUSTS UP TO 40 MPH ARE LIKELY...WHICH WILL CAUSE AREAS OF BLOWING SNOW AND VISIBILITY RESTRICTIONS TO LESS THAN A QUARTER MILE AT TIMES. * IMPACTS...TRAVEL WILL BE DIFFICULT AT TIMES DUE TO HEAVY SNOWFALL ACCUMULATIONS ON ROADWAYS AND POOR VISIBILITIES IN BLOWING SNOW. PASSES MAY CLOSE AT TIMES DUE TO HEAVY SNOWFALL... POOR DRIVING CONDITIONS...AND ACCIDENTS."},{"title":"Winter Storm Warning issued November 16 at 10:27AM MST until November 17 at 8:00AM MST","id":"262764","full":"...STORM BRINGING HEAVY SNOW TO PORTIONS OF THE HIGH COUNTRY AND BLIZZARD CONDITIONS TO MUCH OF NORTHEAST COLORADO TONIGHT AND TUESDAY... .A STRONG WINTER STORM WILL MOVE ACROSS COLORADO TONIGHT AND INTO WESTERN KANSAS BY TUESDAY AFTERNOON. THE STORM IS LIKELY TO PRODUCE HEAVY SNOW IN THE MOUNTAINS AND THEN SNOW...AND VERY STRONG WINDS ON THE PLAINS. BLIZZARD CONDITIONS WILL DEVELOP IN AREAS ROUGHLY ALONG AND SOUTH OF INTERSTATE 76 TONIGHT...WITH CONDITIONS SLOWLY IMPROVING FROM WEST TO EAST DURING THE DAY TUESDAY. WINTER TRAVEL CONDITIONS CAN BE EXPECTED TO QUICKLY DETERIORATE IN THE MOUNTAINS THIS AFTERNOON AND ON THE HIGH PLAINS THIS EVENING. THE WORST CONDITIONS ARE EXPECTED TO OCCUR FROM THE SOUTHERN AND EASTERN SECTIONS OF THE DENVER METRO AREA EAST TOWARDS LIMON AND AKRON. IN THESE AREAS ROAD CLOSURES ARE LIKELY DUE TO WHITEOUT CONDITIONS AND DRIFTING OF HEAVY SNOW. SOME PLACES MAY RECEIVE OVER A FOOT OF SNOW ALONG WITH WIND GUSTS TO AROUND 55 MPH. IN AREAS NORTH OF INTERSTATE 76 SNOWFALL WILL BE LIGHTER...BUT STRONG NORTHERLY WINDS WILL STILL LIKELY PRODUCE EXTENSIVE BLOWING AND DRIFTING SNOW AND HAZARDOUS DRIVING CONDITIONS. ...WINTER STORM WARNING REMAINS IN EFFECT UNTIL 8 AM MST TUESDAY... * TIMING...MODERATE TO HEAVY SNOWFALL WILL BECOME WIDESPREAD IN MOUNTAIN AREA BY THIS AFTERNOON AND CONTINUE OVERNIGHT OVER THE FRONT RANGE MOUNTAINS. SNOWFALL IS EXPECTED TO DIMINISH FROM WEST TO EAST DURING THE DAY TUESDAY. * SNOW ACCUMULATIONS...10 TO 20 INCHES OF SNOW ACCUMULATION IS LIKELY BY EARLY TUESDAY AFTERNOON. * WIND\/VISIBILITY...NORTHWEST WINDS AT 15 TO 25 MPH WITH GUSTS UP TO 40 MPH ARE LIKELY...WHICH WILL CAUSE AREAS OF BLOWING SNOW AND VISIBILITY RESTRICTIONS TO LESS THAN A HALF MILE AT TIMES. * IMPACTS...TRAVEL MAY BECOME DIFFICULT AT TIMES DUE TO HEAVY SNOWFALL ACCUMULATIONS ON ROADWAYS AND POOR VISIBILITIES IN BLOWING SNOW. PASSES MAY CLOSE AT TIMES DUE TO HEAVY SNOWFALL... POOR DRIVING CONDITIONS AND ACCIDENTS."},{"title":"Winter Storm Warning issued November 16 at 5:57AM MST until November 17 at 8:00AM MST","id":"262744","full":"...BLIZZARD CONDITIONS ACROSS MUCH OF THE NORTHEAST COLORADO PLAINS TONIGHT AND TUESDAY WITH AREAS OF HEAVY SNOW IN THE MOUNTAINS... .A STRONG WINTER STORM WILL MOVE ACROSS COLORADO TONIGHT AND INTO WESTERN KANSAS BY TUESDAY AFTERNOON. THE STORM WILL PRODUCE HEAVY SNOW IN THE MOUNTAINS AND THEN SNOW...AND VERY STRONG WINDS ON THE PLAINS. BLIZZARD CONDITIONS WILL DEVELOP IN AREAS ROUGHLY ALONG AND SOUTH OF INTERSTATE 76 LATE TONIGHT...WITH CONDITIONS IMPROVING FROM WEST TO EAST DURING THE DAY TUESDAY. WINTER TRAVEL CONDITIONS CAN BE EXPECTED IN THE MOUNTAINS BY THIS AFTERNOON. THE WORST CONDITIONS ARE EXPECTED TO OCCUR FROM THE SOUTHERN AND EASTERN SECTIONS OF THE DENVER METRO AREA EAST TOWARDS LIMON AND AKRON. IN THESE AREAS ROAD CLOSURES ARE LIKELY DUE TO WHITEOUT CONDITIONS AND DRIFTING OF HEAVY SNOW. SOME PLACES MAY RECEIVE OVER A FOOT OF SNOW ALONG WITH WIND GUSTS TO 60 MPH. IN AREAS NORTH OF INTERSTATE 76 THE SNOW WILL BE LIGHTER...BUT THE STRONG WINDS WILL STILL CAUSE EXTENSIVE BLOWING AND DRIFTING SNOW AND HAZARDOUS DRIVING CONDITIONS. ...WINTER STORM WARNING IN EFFECT FROM 11 AM THIS MORNING TO 8 AM MST TUESDAY... THE NATIONAL WEATHER SERVICE IN DENVER HAS ISSUED A WINTER STORM WARNING FOR HEAVY SNOW...WHICH IS IN EFFECT FROM 11 AM THIS MORNING TO 8 AM MST TUESDAY. THE WINTER STORM WATCH IS NO LONGER IN EFFECT. * TIMING...SNOW WILL DEVELOP BY EARLY AFTERNOON AND THEN BECOME HEAVY AT TIMES OVERNIGHT. SNOW WILL BEGIN DIMINISHING BY MIDDAY TUESDAY. * SNOW ACCUMULATIONS...10 TO 20 INCHES OF NEW SNOW WILL BE POSSIBLE BY TUESDAY AFTERNOON. * WIND\/VISIBILITY...NORTHWEST WINDS AT 15 TO 25 MPH WITH GUSTS UP TO 40 MPH WILL BE POSSIBLE...CAUSING SOME BLOWING SNOW AND VISIBILITIES RESTRICTED TO A HALF MILE OR LESS AT TIMES. * IMPACTS...TRAVEL MAY BECOME DIFFICULT AT TIMES DUE TO HEAVY SNOWFALL ACCUMULATIONS ON ROADWAYS AND POOR VISIBILITIES IN BLOWING SNOW."},{"title":"Winter Storm Watch issued November 15 at 9:32PM MST until November 17 at 8:00AM MST","id":"262658","full":"...POWERFUL WINTER STORM MOVING INTO COLORADO MONDAY AND MONDAY NIGHT... .A POTENT WINTER STORM IS EXPECTED TO MOVE ACROSS COLORADO MONDAY NIGHT WHICH WILL PRODUCE HEAVY SNOW IN THE MOUNTAINS AND THEN SNOW...STRONG GUSTY WINDS...AND A POSSIBLE BLIZZARD ON THE PLAINS MONDAY NIGHT AND TUESDAY MORNING. THE HEAVY SNOW FALLING IN THE MOUNTAINS WILL MAKE TRAVEL CONDITIONS DIFFICULT DUE TO SNOW COVERED ROADWAYS MONDAY NIGHT AND TUESDAY MORNING. ON THE PLAINS...AS THE SNOW BEGINS FALLING AND NORTHERLY WINDS BECOME STRONG AND GUSTY...BLIZZARD CONDITIONS MAY DEVELOP MAKING TRAVEL DIFFICULT IF NOT IMPOSSIBLE. THE WORST CONDITIONS ARE EXPECTED TO OCCUR FROM THE EASTERN SECTIONS OF THE DENVER METRO AREA EAST AND NORTHEAST ACROSS THE PLAINS OF COLORADO. ...WINTER STORM WATCH REMAINS IN EFFECT FROM 8 AM MST MONDAY THROUGH TUESDAY MORNING... * TIMING...SNOW IS EXPECTED TO BEGIN FALLING IN THE NORTH CENTRAL COLORADO MOUNTAINS MONDAY MORNING AND THEN BECOME HEAVY AT TIMES MONDAY AFTERNOON AND NIGHT. SNOW WILL BEGIN DIMINISHING BY MIDDAY TUESDAY. * SNOW ACCUMULATIONS...6 TO 14 INCHES OF NEW SNOW WILL BE POSSIBLE BY TUESDAY AFTERNOON. * WIND\/VISIBILITY...NORTHWEST WINDS AT 15 TO 25 MPH WITH GUSTS UP TO 35 MPH WILL BE POSSIBLE...CAUSING SOME BLOWING SNOW AND VISIBILITIES RESTRICTED TO A HALF MILE OR LESS AT TIMES. * IMPACTS...TRAVEL MAY BECOME DIFFICULT AT TIMES DUE TO HEAVY SNOWFALL ACCUMULATIONS ON ROADWAYS AND POOR VISIBILITIES IN BLOWING SNOW."},{"title":"Winter Storm Watch issued November 15 at 3:36PM MST until November 17 at 8:00AM MST","id":"262590","full":"...STRONG WINTER STORM MOVING OVER COLORADO MONDAY NIGHT... .A POTENT WINTER STORM IS EXPECTED TO MOVE ACROSS COLORADO MONDAY NIGHT WHICH WILL PRODUCE HEAVY SNOW IN THE MOUNTAINS AND THEN SNOW AND GUSTY WINDS ON THE PLAINS BY TUESDAY MORNING. THE HEAVY SNOW FALLING IN THE MOUNTAINS WILL MAKE TRAVEL CONDITIONS DIFFICULT DUE TO SNOW COVERED ROADWAYS MONDAY NIGHT AND TUESDAY MORNING. ON THE PLAINS...AS THE SNOW BEGINS FALLING AND NORTHERLY WINDS INCREASE...IT IS POSSIBLE THAT AREAS OF BLOWING AND DRIFTING SNOW WILL MAKE TRAVEL DIFFICULT DUE TO POOR VISIBILITIES AND SNOW COVERED ROADS. ...WINTER STORM WATCH IN EFFECT FROM MONDAY MORNING THROUGH TUESDAY MORNING... THE NATIONAL WEATHER SERVICE IN DENVER HAS ISSUED A WINTER STORM WATCH...WHICH IS IN EFFECT FROM MONDAY MORNING THROUGH TUESDAY MORNING. * TIMING...SNOW IS EXPECTED TO BEGIN FALLING IN THE NORTH CENTRAL COLORADO MOUNTAINS LATE MONDAY MORNING AND THEN BECOME HEAVY AT TIMES MONDAY NIGHT. SNOW WILL BEGIN DIMINISHING BY MIDDAY TUESDAY. * SNOW ACCUMULATIONS...8 TO 16 INCHES OF NEW SNOW WILL BE POSSIBLE BY TUESDAY AFTERNOON. LOCALLY HIGHER AMOUNTS WILL ALSO BE POSSIBLE. * WIND\/VISIBILITY...NORTHWEST WINDS AT 15 TO 25 MPH WITH GUSTS UP TO 35 MPH WILL BE POSSIBLE...CAUSING SOME BLOWING SNOW AND VISIBILITIES RESTRICTED TO A HALF MILE OR LESS AT TIMES. * IMPACTS...TRAVEL MAY BECOME DIFFICULT AT TIMES DUE TO HEAVY SNOWFALL ACCUMULATIONS ON ROADWAYS AND POOR VISIBILITIES IN BLOWING SNOW."}]},"current_conditions":{"temp":"8","wind_dir":"N","wind_speed":"24","location":"Located Nearby","updated_at":"2015-11-17 14:00:00"},"forecast":{"updated_at":"2015-11-17 13:13:11","period":[{"date":"2015-11-17","dow":"Tuesday","day":{"snow":"1-3","weather":"Snow","wind_dir":"W","wind_speed":"Gusts to 30-40mph","temp":"24","icon":"sn.png"},"night":{"snow":"1-3","weather":"Snow and Blustery","wind_dir":"W","wind_speed":"Gusts to 40-50mph","temp":"12","icon":"nsn.png"}},{"date":"2015-11-18","dow":"Wednesday","day":{"snow":"1-3","weather":"Snow Likely and Areas Blowing Snow","wind_dir":"W","wind_speed":"Gusts to 50-60mph","temp":"19","icon":"sn.png"},"night":{"snow":"0-1","weather":"Chance Snow Showers and Breezy","wind_dir":"W","wind_speed":"Gusts to 40-50mph","temp":"15","icon":"nsn.png"}},{"date":"2015-11-19","dow":"Thursday","day":{"snow":"0","weather":"Chance Snow Showers and Windy","wind_dir":"W","wind_speed":"Gusts to 30-40mph","temp":"29","icon":"sn.png"},"night":{"snow":"0-1","weather":"Slight Chance Snow Showers and Windy","wind_dir":"W","wind_speed":"Gusts to 30-40mph","temp":"21","icon":"nsn.png"}},{"date":"2015-11-20","dow":"Friday","day":{"snow":"1-3","weather":"Mostly Sunny and Breezy","wind_dir":"W","wind_speed":"Gusts to 50-60mph","temp":"32","icon":"wind_sct.png"},"night":{"snow":"0-1","weather":"Slight Chance Snow Showers and Breezy","wind_dir":"W","wind_speed":"Gusts to 30-40mph","temp":"21","icon":"nsn.png"}},{"date":"2015-11-21","dow":"Saturday","day":{"snow":"0","weather":"Slight Chance Snow Showers and Breezy","wind_dir":"W","wind_speed":"Gusts to 20-30mph","temp":"33","icon":"sn.png"},"night":{"snow":"0","weather":"Slight Chance Snow Showers","wind_dir":"W","wind_speed":"Gusts to 20-30mph","temp":"18","icon":"nsn.png"}}]}}}');
                if ((data.location.watch_warnings) && (data.location.watch_warnings.item) && (data.location.watch_warnings.item.length > 0)) {
                    if (data.location.watch_warnings.item[0].title.length > 25) {
                        $scope.warningsTeaser = data.location.watch_warnings.item[0].title.substring(0, 22) + '...';
                    } else {
                        $scope.warningsTeaser = data.location.watch_warnings.item[0].title;
                    }
                }
                /*
                if ((data.location) && (data.location.current_conditions)) {
                    $scope.currentWeather = data.location.current_conditions.temp + '° recently reported';
                    $scope.openWeather = null;
                }
                */
                for (i = 0; i < data.location.forecast.period.length; i += 1) {
                    if ('0' !== data.location.forecast.period[i].day.snow) {
                        days[n] = {};
                        if ('USA' === patrol.country) {
                            days[n].forecast = data.location.forecast.period[i].dow + ' Daytime - ' + data.location.forecast.period[i].day.snow + '"';
                        } else {
                            if (data.location.forecast.period[i].day.snow.indexOf('-') > 0) {
                                days[n].forecast = data.location.forecast.period[i].dow + ' Daytime - ' +
                                    2 * Math.round(1.27 * Number(data.location.forecast.period[i].day.snow.split('-')[0])) + ' - ' +
                                    2 * Math.round(1.27 * Number(data.location.forecast.period[i].day.snow.split('-')[1])) + ' cm';
                            } else {
                                days[n].forecast = data.location.forecast.period[i].dow + ' Daytime - ' +
                                    2 * Math.round(1.27 * Number(data.location.forecast.period[i].day.snow)) + ' cm';
                            }
                        }
                        n = n + 1;
                    }
                    if ('0' !== data.location.forecast.period[i].night.snow) {
                        days[n] = {};
                        if ('USA' === patrol.country) {
                            days[n].forecast = data.location.forecast.period[i].dow + ' Overnight - ' + data.location.forecast.period[i].night.snow + '"';
                        } else {
                            if (data.location.forecast.period[i].night.snow.indexOf('-') > 0) {
                                days[n].forecast = data.location.forecast.period[i].dow + ' Overnight - ' +
                                    2 * Math.round(1.27 * Number(data.location.forecast.period[i].night.snow.split('-')[0])) + ' - ' +
                                    2 * Math.round(1.27 * Number(data.location.forecast.period[i].night.snow.split('-')[1])) + ' cm';
                            } else {
                                days[n].forecast = data.location.forecast.period[i].dow + ' Overnight - ' +
                                    2 * Math.round(1.27 * Number(data.location.forecast.period[i].day.snow)) + ' cm';
                            }
                        }
                        n = n + 1;
                    }
                }
                if (0 === n) {
                    days[0] = {};
                    days[0].forecast = 'No snow in the forecast';
                }
                $scope.days = days;
                localStorage.setItem('DspOpenSnow', angular.toJson(data));
            }).
            error(function (data, status, headers, config) {
                AccessLogService.log('error', 'GetOpenSnowErr', niceMessage(data, status));
            });
    } else {
        $scope.hideWeather = true;
    }
    if (patrol.caicJson) {
        $scope.hideAvy = null;
        if (!gotCaicForecast) {
            $http(caicForecastRequest).
                success(function (data, status, headers, config) {
                    $scope.avyForecast = summarizeCaicAvyForecast(data);
                    localStorage.setItem('DspCaicForecast', angular.toJson(data));
                    gotCaicForecast = true;
                }).
                error(function (data, status, headers, config) {
                    AccessLogService.log('error', 'PostCaicForecastErr', niceMessage(data, status));
                });
        }
    } else {
        localStorage.removeItem('DspCaicForecast');
        $scope.hideAvy = true;
    }
    if ('Yes' === patrol.haveMtnXmlFeed) {
        $http(facilitiesRequest).
            success(function (data, status, headers, config) {
                $scope.liftsRunning = summarizeLiftStatus(data);
                $scope.areas = summarizeTrailStatus(data);
                localStorage.setItem('DspFacilities', angular.toJson(data));
                $scope.hideMtnXml = null;
            }).
            error(function (data, status, headers, config) {
                AccessLogService.log('error', 'GetFacilitiesErr', niceMessage(data, status));
            });
    } else {
        $scope.hideMtnXml = true;
    }
    $http(liveCamRequest).
        success(function (data, status, headers, config) {
            liveCam = data.resource;
            if (liveCam && territories) {
                mountainCamCount = 0;
                travelCamCount = 0;
                for (i = 0; i < liveCam.length; i += 1) {
                    isMountainCam = false;
                    for (n = 0; n < territories.length; n += 1) {
                        if (liveCam[i].territory === territories[n].code) {
                            if (territories[n].onResort === 'Yes') {
                                isMountainCam = true;
                            }
                        }
                    }
                    if (isMountainCam) {
                        mountainCamCount += 1;
                    } else {
                        travelCamCount += 1;
                    }
                }
                if (mountainCamCount > 0) {
                    $scope.liveCams = mountainCamCount + ' mountain cams';                
                } else {
                    $scope.liveCams = null;
                }
                if (travelCamCount > 0) {
                    $scope.travelCams = travelCamCount + ' travel cams';                
                } else {
                    $scope.travelCams = null;
                }
            } else {
                $scope.liveCams = null;
                $scope.travelCams = null;
            }
            localStorage.setItem('DspLiveCam', angular.toJson(data.resource));
        }).
        error(function (data, status, headers, config) {
            AccessLogService.log('error', 'GetLiveCamErr', niceMessage(data, status));
        });
    $scope.adClick = function () {
        AccessLogService.log('info', 'AdClick', $scope.adLinkAddress);
        openAd($scope.adLinkAddress);
    };
    $scope.showTrails = function (index) {
        localStorage.setItem('OnsArea', $scope.areas[index].name);
        homeNavigator.pushPage('home/trailstatus.html');
    };
    ons.ready(function () {
        return;
    });
});

/*
Posts.
*/
module.controller('PostsController', function ($rootScope, $scope, $http, AccessLogService) {
    var patrolPrefix = localStorage.getItem('DspPatrolPrefix'),
        postRequest = dspRequest('GET', '/team/_table/Post?limit=25&order=postedOn%20desc', null),
        posts = angular.fromJson(localStorage.getItem('DspPost')),
        i = 0,
        element = document.getElementById('photo');
    AccessLogService.log('info', 'Posts');
    localStorage.removeItem('OnsPhoto');
    element.src = null;
    element.style.display = 'none';
    if (!posts) {
        posts = angular.fromJson(localStorage.getItem('DspFirstPost'));
    }
    if (posts) {
        for (i = 0; i < posts.length; i += 1) {
            posts[i].displayDate = moment(posts[i].postedOn).format('ddd, MMM D h:mmA');
            $scope.posts = posts;
        }
    }
    postRequest.cache = false;
    $http(postRequest).
        success(function (data, status, headers, config) {
            posts = data.resource;
            for (i = 0; i < posts.length; i += 1) {
                posts[i].displayDate = moment(posts[i].postedOn).format('ddd, MMM D h:mmA');
            }
            $scope.posts = posts;
            localStorage.setItem('DspPost', angular.toJson(posts));
        }).
        error(function (data, status, headers, config) {
            AccessLogService.log('error', 'GetPostErr', niceMessage(data, status));
            $scope.message = niceMessage(data, status);
        });
    $scope.togglePoster = function () {
        var element = document.getElementById('photo');
        element.src = null;
        element.style.display = 'none';
        $scope.poster = !$scope.poster;
    };
    $scope.capturePhoto = function () {
        var options = {
                quality: 100,
                encodingType: Camera.EncodingType.JPEG,
        		destinationType: navigator.camera.DestinationType.DATA_URL,
                sourceType: navigator.camera.PictureSourceType.SAVEDPHOTOALBUM,
                correctOrientation: true,
                targetWidth: 320
            },
            element = document.getElementById('photo');
        if (navigator && navigator.camera) {
            navigator.camera.getPicture(function (imageData) {
                element.src = 'data:image/jpeg;base64,' + imageData;
                element.style.display = 'initial';
                localStorage.setItem('OnsPhoto', imageData);
            }, function (message) {
                $scope.message = '';
                localStorage.removeItem('OnsPhoto');
                element.src = null;
                element.style.display = 'none';
            }, options);
        } else {
            $scope.message = 'Camera not detected.';
            localStorage.removeItem('OnsPhoto');
            element.src = null;
            element.style.display = 'none';
            element = document.getElementById('uploadButton');
            element.style.display = 'none';
        }
    };
    $scope.post = function () {
        var aMoment = moment(),
            uniqueFilename = aMoment.format('YYYYMMDDHHmmss'),
            imageData = localStorage.getItem('OnsPhoto'),
            ts = aMoment.format('X'),
            settings = angular.fromJson(localStorage.getItem('DspSetting')),
            names = settings.map(function(setting) {
                return setting.name;
            }),
            cloudinaryApiKey = settings[names.indexOf('cloudinaryApiKey')].value,
            cloudinaryApiSecret = settings[names.indexOf('cloudinaryApiSecret')].value,
            rawSignature = 'public_id=' + uniqueFilename + '&timestamp=' + ts + cloudinaryApiSecret,
            shaObj = new jsSHA(rawSignature, 'TEXT'),
            hash = shaObj.getHash('SHA-1', 'HEX'),
            cloudinaryBody = {
                api_key: cloudinaryApiKey,
                file: 'data:image/jpeg;base64,' + imageData,
                public_id: uniqueFilename,
                timestamp: ts,
                signature: hash
            },
            body = { resource: [{
                id: null,
                tenantId: patrolPrefix,
                postedOn: aMoment.format('YYYY-MM-DD HH:mm:ss') + ' UTC',
                body: $scope.body,
                userId: localStorage.getItem('DspUserId'),
                postedBy: localStorage.getItem('DspName')
            }]},
            postPostRequest = dspRequest('POST', '/team/_table/Post', body);
        if (imageData) {
            body.imageReference = 'http://res.cloudinary.com/skipatrol/image/upload/' + uniqueFilename + '.jpg';
        }
        havePatience($rootScope);
        $http(postPostRequest).
            success(function (data, status, headers, config) {
                postRequest.cache = false;
                $http(postRequest).
                    success(function (data, status, headers, config) {
                        posts = data.resource;
                        for (i = 0; i < posts.length; i += 1) {
                            posts[i].displayDate = moment(posts[i].postedOn).format('ddd, MMM D h:mmA');
                        }
                        if (imageData) {
                            $http.post('https://api.cloudinary.com/v1_1/skipatrol/image/upload', cloudinaryBody).
                                then(function(response) {
                                    element = document.getElementById('photo');
                                    element.src = null;
                                    element.style.display = 'none';
                                    $scope.posts = posts;
                                    $scope.poster = false;
                                    $scope.body = '';
                                    localStorage.removeItem('OnsPhoto');
                                    waitNoMore();
                                }, function(response) {
                                    $scope.message = 'Failed to upload photo.';
                                    element = document.getElementById('photo');
                                    element.src = null;
                                    element.style.display = 'none';
                                    $scope.posts = posts;
                                    $scope.poster = false;
                                    $scope.body = '';
                                    localStorage.removeItem('OnsPhoto');
                                    waitNoMore();
                                    AccessLogService.log('error', 'CloudinaryPostErr', 'Failed to upload ' + body.imageReference);
                                });
                        } else {
                            element = document.getElementById('photo');
                            element.src = null;
                            element.style.display = 'none';
                            $scope.posts = posts;
                            $scope.poster = false;
                            $scope.body = '';
                            localStorage.removeItem('OnsPhoto');
                            waitNoMore();
                        }
                    }).
                    error(function (data, status, headers, config) {
                        AccessLogService.log('error', 'GetPostErr', niceMessage(data, status));
                        $scope.message = niceMessage(data, status);
                        waitNoMore();
                    });
            }).
            error(function (data, status, headers, config) {
                AccessLogService.log('error', 'PostPostErr', niceMessage(data, status));
                $scope.message = niceMessage(data, status);
                $scope.message = niceMessage(data, status);
                waitNoMore();
            });
    };
    $scope.showPost = function (index) {
        localStorage.setItem('OnsPost', angular.toJson(posts[index]));
        homeNavigator.pushPage('home/post.html');
    };
    $scope.close = function () {
        homeNavigator.popPage();
    };
    ons.ready(function () {
        return;
    });
});

/*
Post.
*/
module.controller('PostController', function ($rootScope, $scope, $http, AccessLogService) {
    var patrolPrefix = localStorage.getItem('DspPatrolPrefix'),
        userId = localStorage.getItem('DspUserId'),
        post = angular.fromJson(localStorage.getItem('OnsPost'));
    AccessLogService.log('info', 'Post', post.postedOn);
    $scope.postedBy = post.postedBy;
    $scope.displayDate = post.displayDate;
    $scope.body = post.body;
    $scope.image = post.imageReference;
    if (userId == post.userId) {
        $scope.poster = true;
    }
    $scope.update = function () {
        var body = {
                id: post.id,
                tenantId: patrolPrefix,
                postedOn: post.postedOn,
                body: $scope.body,
                userId: post.userId,
                postedBy: post.postedBy
            },
            putPostRequest = dspRequest('PUT', '/team/_table/Post', body);
        havePatience($rootScope);
        $http(putPostRequest).
            success(function (data, status, headers, config) {
                waitNoMore();
                homeNavigator.pushPage('home/posts.html');
            }).
            error(function (data, status, headers, config) {
                AccessLogService.log('error', 'PutPostErr', niceMessage(data, status));
                $scope.message = niceMessage(data, status);
                waitNoMore();
            });
    };
    $scope.remove = function () {
        var deletePostRequest = dspRequest('DELETE', '/team/_table/Post/' + post.id, null);
        havePatience($rootScope);
        $http(deletePostRequest).
            success(function (data, status, headers, config) {
                waitNoMore();
                homeNavigator.pushPage('home/posts.html');
            }).
            error(function (data, status, headers, config) {
                AccessLogService.log('error', 'DeletePostErr', niceMessage(data, status));
                $scope.message = niceMessage(data, status);
                waitNoMore();
            });
    };
    $scope.close = function () {
        homeNavigator.popPage();
    };
    ons.ready(function () {
        return;
    });
});

/*
Snow conditions.
*/
module.controller('SnowConditionsController', function ($scope, AccessLogService) {
    var patrol = angular.fromJson(localStorage.getItem('DspPatrol')),
        myWeather2 = angular.fromJson(localStorage.getItem('DspMyWeather2'));
    AccessLogService.log('info', 'SnowConditions');
    if (myWeather2) {
        $scope.snowConditions = myWeather2.weather.snow_report[0].conditions;
        $scope.lastSnowDate = 'Last snow: ' + myWeather2.weather.snow_report[0].last_snow_date;
        // OK, so these conversions are all hacky. It's because there's a bug in the backend and we're compensating here...
        if ('USA' === patrol.country) {
            $scope.upperSnowDepth = Math.round(Number(myWeather2.weather.snow_report[0].upper_snow_depth) * 2.54) + '" upper snow depth';
            $scope.lowerSnowDepth = Math.round(Number(myWeather2.weather.snow_report[0].lower_snow_depth) * 2.54) + '" lower snow depth';
        } else {
            $scope.upperSnowDepth = Math.round(Number(myWeather2.weather.snow_report[0].upper_snow_depth) * 6.4516) + ' cm upper snow depth';
            $scope.lowerSnowDepth = Math.round(Number(myWeather2.weather.snow_report[0].lower_snow_depth) * 6.4516) + ' cm lower snow depth';
        }
        $scope.reportDate = 'Updated: ' + myWeather2.weather.snow_report[0].report_date;
    }
    if (settingSnowConditionsImage) {
        $scope.snowConditionsImage = settingSnowConditionsImage;
    } else {
        $scope.snowConditionsImage = 'img/whitemountain.png';
    }
    $scope.close = function () {
        homeNavigator.popPage();
    };
    ons.ready(function () {
        return;
    });
});

/*
Weather warnings.
*/
module.controller('WeatherWarningsController', function ($scope, AccessLogService) {
    var openSnow = angular.fromJson(localStorage.getItem('DspOpenSnow'));
    AccessLogService.log('info', 'WeatherWarnings');
    if ((openSnow) && (openSnow.location.watch_warnings) && (openSnow.location.watch_warnings.item) && (openSnow.location.watch_warnings.item.length > 0)) {
        $scope.items = openSnow.location.watch_warnings.item;
        if ((openSnow.location) && (openSnow.location.current_conditions)) {
            $scope.reportDate = 'Updated: ' + openSnow.location.current_conditions.updated_at;
        }
    }
    $scope.close = function () {
        homeNavigator.popPage();
    };
    ons.ready(function () {
        return;
    });
});

/*
Current weather, from OpenSnow. DEFUNCT! And not localized.
*/
module.controller('CurrentWeatherController', function ($scope, AccessLogService) {
    var openSnow = angular.fromJson(localStorage.getItem('DspOpenSnow'));
    AccessLogService.log('info', 'CurrentWeather');
    if ((openSnow) && (openSnow.location) && (openSnow.location.current_conditions)) {
        $scope.currentTemperature = openSnow.location.current_conditions.temp + '°';
        $scope.windDirection = 'Wind direction: ' + openSnow.location.current_conditions.wind_dir;
        $scope.windSpeed = 'Wind speed: ' + openSnow.location.current_conditions.wind_speed;
        $scope.reportDate = 'Updated: ' + openSnow.location.current_conditions.updated_at;
    }
    $scope.close = function () {
        homeNavigator.popPage();
    };
    ons.ready(function () {
        return;
    });
});

/*
Current weather, from OpenWeatherMap.
*/
module.controller('OpenWeatherController', function ($scope, AccessLogService) {
    var patrol = angular.fromJson(localStorage.getItem('DspPatrol')),
        openWeatherMap = angular.fromJson(localStorage.getItem('DspOpenWeatherMap'));
    AccessLogService.log('info', 'OpenWeather');
    if ((openWeatherMap) && (openWeatherMap.main) && (openWeatherMap.main.temp)) {
        if ('USA' === patrol.country) {
            $scope.currentTemperature = Math.round(openWeatherMap.main.temp) + ' °F';
            $scope.windSpeed = 'Wind speed: ' + Math.round(openWeatherMap.wind.speed) + ' mph';
        } else {
            $scope.currentTemperature = Math.round((openWeatherMap.main.temp - 32) * 0.5556) + ' °C';
            $scope.windSpeed = 'Wind speed: ' + Math.round(1.60934 * Number(openWeatherMap.wind.speed)) + ' km/h';
        }
        $scope.windDirection = 'Wind direction: ' + writeOutBearing(openWeatherMap.wind.deg);
        $scope.humidity = 'Humidity: ' + Math.round(openWeatherMap.main.humidity) + '%';
        $scope.reportDate = 'Updated: ' + new Date(openWeatherMap.dt * 1000);
    }
    $scope.close = function () {
        homeNavigator.popPage();
    };
    ons.ready(function () {
        return;
    });
});

/*
Weather forecast.
*/
module.controller('WeatherForecastController', function ($scope, AccessLogService) {
    var patrol = angular.fromJson(localStorage.getItem('DspPatrol')),
        openSnow = angular.fromJson(localStorage.getItem('DspOpenSnow')),
        days = [],
        i = 0,
        pieces,
        nums,
        l,
        u;
    AccessLogService.log('info', 'WeatherForecast');
    $scope.days = [];
    if (openSnow) {
        for (i = 0; i < openSnow.location.forecast.period.length; i += 1) {
            // Note that some other good icons appear to be the following:
            // http://www.methownet.com/images/botperm/
            // http://ladner-bc.ca/wxsim/icons/
            // https://opensnow.com/img/wxicons/medium/
            // http://forecast.weather.gov/newimages/medium/
            days[i] = {};
            days[i].dayName = openSnow.location.forecast.period[i].dow;
            // days[i].dayIcon = 'http://forecast.weather.gov/newimages/medium/' + openSnow.location.forecast.period[i].day.icon;
            // Hack to handle some missing icons...
            if ('chancesn.png' === openSnow.location.forecast.period[i].day.icon) {
                openSnow.location.forecast.period[i].day.icon = 'sn.png';
            }
            days[i].dayIcon = 'img/nws/newicons/' + openSnow.location.forecast.period[i].day.icon;
            days[i].dayWeather = openSnow.location.forecast.period[i].day.weather;
            days[i].dayWind = 'Wind: ' + openSnow.location.forecast.period[i].day.wind_dir;
            // days[i].nightIcon = 'http://forecast.weather.gov/newimages/medium/' + openSnow.location.forecast.period[i].night.icon;
            // Hack to handle some missing icons...
            if ('nchancesn.png' === openSnow.location.forecast.period[i].day.icon) {
                openSnow.location.forecast.period[i].day.icon = 'nsn.png';
            }
            days[i].nightIcon = 'img/nws/newicons/' + openSnow.location.forecast.period[i].night.icon;
            days[i].nightWeather = openSnow.location.forecast.period[i].night.weather;
            days[i].nightWind = 'Wind: ' + openSnow.location.forecast.period[i].night.wind_dir;
            if ('USA' === patrol.country) {
                days[i].daySnow = 'Snow: ' + openSnow.location.forecast.period[i].day.snow + '"';
                days[i].dayTemp = openSnow.location.forecast.period[i].day.temp + ' °F';
                days[i].dayWindSpeed = openSnow.location.forecast.period[i].day.wind_speed;
                days[i].nightSnow = 'Snow: ' + openSnow.location.forecast.period[i].night.snow + '"';
                days[i].nightTemp = openSnow.location.forecast.period[i].night.temp + ' °F';
                days[i].nightWindSpeed = openSnow.location.forecast.period[i].night.wind_speed;
            } else {
                if (openSnow.location.forecast.period[i].day.snow.indexOf('-') > 0) {
                    days[i].daySnow = 'Snow: ' +
                        2 * Math.round(1.27 * Number(openSnow.location.forecast.period[i].day.snow.split('-')[0])) + ' - ' +
                        2 * Math.round(1.27 * Number(openSnow.location.forecast.period[i].day.snow.split('-')[1])) + ' cm';
                } else {
                    days[i].daySnow = 'Snow: ' +
                        2 * Math.round(1.27 * Number(openSnow.location.forecast.period[i].day.snow)) + ' cm';
                }
                days[i].dayTemp = Math.round((openSnow.location.forecast.period[i].day.temp - 32) * 0.5556) + ' °C';
                pieces = openSnow.location.forecast.period[i].day.wind_speed.split(' ');
                nums = pieces[pieces.length - 1].split('-');
                if (nums.length > 1) {
                    l = nums[0];
                    u = nums[1].split('mph')[0];
                    days[i].dayWindSpeed = 5 * Math.round(0.2 * 1.60934 * Number(l)) + ' -  ' + 5 * Math.round(0.2 * 1.60934 * Number(u)) + ' km/h';
                } else {
                    u = nums[0].split('mph')[0];
                    days[i].dayWindSpeed = 5 * Math.round(0.2 * 1.60934 * Number(u)) + ' km/h';
                }
                if (openSnow.location.forecast.period[i].night.snow.indexOf('-') > 0) {
                    days[i].nightSnow = 'Snow: ' +
                        2 * Math.round(1.27 * Number(openSnow.location.forecast.period[i].night.snow.split('-')[0])) + ' - ' +
                        2 * Math.round(1.27 * Number(openSnow.location.forecast.period[i].night.snow.split('-')[1])) + ' cm';
                } else {
                    days[i].nightSnow = 'Snow: ' +
                        2 * Math.round(1.27 * Number(openSnow.location.forecast.period[i].night.snow)) + ' cm';
                }
                days[i].nightTemp = Math.round((openSnow.location.forecast.period[i].night.temp - 32) * 0.5556) + ' °C';
                pieces = openSnow.location.forecast.period[i].night.wind_speed.split(' ');
                nums = pieces[pieces.length - 1].split('-');
                if (nums.length > 1) {
                    l = nums[0];
                    u = nums[1].split('mph')[0];
                    days[i].nightWindSpeed = 5 * Math.round(0.2 * 1.60934 * Number(l)) + ' -  ' + 5 * Math.round(0.2 * 1.60934 * Number(u)) + ' km/h';
                } else {
                    u = nums[0].split('mph')[0];
                    days[i].nightWindSpeed = 5 * Math.round(0.2 * 1.60934 * Number(u)) + ' km/h';
                }
            }
        }
        $scope.days = days;
        $scope.reportDate = 'Updated: ' + openSnow.location.forecast.updated_at + ' UTC';
    }
    $scope.close = function () {
        homeNavigator.popPage();
    };
    ons.ready(function () {
        return;
    });
});

/*
Avalanche forecast.
*/
module.controller('AvyForecastController', function ($scope, $sce, AccessLogService) {
    var caicForecast = angular.fromJson(localStorage.getItem('DspCaicForecast')),
        now = moment(),
        today,
        tomorrow,
        element,
        rating;
    AccessLogService.log('info', 'AvyForecast');
    if (caicForecast) {
        today = moment(caicForecast.zones_array.date);
        tomorrow = moment(today);
        tomorrow.add(1, 'days');
        $scope.today = today.format('dddd');
        $scope.tomorrow = tomorrow.format('dddd');
        element = document.getElementById('todayHigh');
        rating = caicForecast.zones_array.rating.substring(0, 1);
        element.setAttribute('src', 'img/' + rating + '.png');
        element = document.getElementById('todayMiddle');
        rating = caicForecast.zones_array.rating.substring(1, 2);
        element.setAttribute('src', 'img/' + rating + '.png');
        element = document.getElementById('todayLow');
        rating = caicForecast.zones_array.rating.substring(2, 3);
        element.setAttribute('src', 'img/' + rating + '.png');
        element = document.getElementById('tomorrowHigh');
        rating = caicForecast.zones_array.rating.substring(3, 4);
        element.setAttribute('src', 'img/' + rating + '.png');
        element = document.getElementById('tomorrowMiddle');
        rating = caicForecast.zones_array.rating.substring(4, 5);
        element.setAttribute('src', 'img/' + rating + '.png');
        element = document.getElementById('tomorrowLow');
        rating = caicForecast.zones_array.rating.substring(5);
        element.setAttribute('src', 'img/' + rating + '.png');
        if ((now.format('YYY-MM-DD') !== today.format('YYY-MM-DD')) && (now.subtract(1, 'days').format('YYY-MM-DD') !== today.format('YYY-MM-DD'))) {
            $scope.message = 'Avalanche forecast is not current; note the forecast dates below';
            $scope.today += ', ' + today.format('MMM D, YYYY');
            $scope.tomorrow += ', ' + tomorrow.format('MMM D, YYYY');
        }
        // http://stackoverflow.com/questions/960156/regex-in-javascript-to-remove-links
        $scope.summary = $sce.trustAsHtml(caicForecast.zones_array.summary.replace(/<a\b[^>]*>(.*?)<\/a>/i,""));
        $scope.discussion = $sce.trustAsHtml(caicForecast.zones_array.discussion);
        $scope.specialStatement = caicForecast.zones_array.special_statement;
        if (caicForecast.zones_array.date_modified && (caicForecast.zones_array.date !== caicForecast.zones_array.date_modified)) {
            $scope.reportDate = 'Updated: ' + caicForecast.zones_array.date + ' (modified ' + caicForecast.zones_array.date_modified + ')';
        } else {
            $scope.reportDate = 'Updated: ' + caicForecast.zones_array.date;
        }
    } else {
        homeNavigator.popPage();
    }
    $scope.close = function () {
        homeNavigator.popPage();
    };
    ons.ready(function () {
        return;
    });
});

/*
Lift status.
*/
module.controller('LiftStatusController', function ($scope, AccessLogService) {
    var data = angular.fromJson(localStorage.getItem('DspFacilities')),
        lifts = [],
        n = 0,
        i = 0,
        j = 0;
    AccessLogService.log('info', 'LiftStatus');
    $scope.lifts = [];
    for (i = 0; i < data.facilities.areas.area.length; i += 1) {
        if ('undefined' !== typeof data.facilities.areas.area[i].lifts) {
            if (data.facilities.areas.area[i].lifts.lift.constructor === Array) {
                for (j = 0; j < data.facilities.areas.area[i].lifts.lift.length; j += 1) {
                    lifts[n] = {};
                    lifts[n].name = data.facilities.areas.area[i].lifts.lift[j].name;
                    if ('open' === data.facilities.areas.area[i].lifts.lift[j].status) {
                        lifts[n].statusIcon = 'fa-check';
                        lifts[n].statusIconColor = 'green';
                    } else {
                        lifts[n].statusIcon = 'fa-ban';
                        lifts[n].statusIconColor = 'red';
                    }
                    n = n + 1;
                }
            } else {
                lifts[n] = {};
                lifts[n].name = data.facilities.areas.area[i].lifts.lift.name;
                if ('open' === data.facilities.areas.area[i].lifts.lift.status) {
                    lifts[n].statusIcon = 'fa-check';
                    lifts[n].statusIconColor = 'green';
                } else {
                    lifts[n].statusIcon = 'fa-ban';
                    lifts[n].statusIconColor = 'red';
                }
                n = n + 1;
            }
        }
    }
    lifts.sort(function (a, b) {
        var sortVal = 0;
        if (a.name < b.name) {
            sortVal = -1;
        } else if (a.name > b.name) {
            sortVal = 1;
        }
        return sortVal;
    });
    $scope.lifts = lifts;
    $scope.logoAddress = angular.fromJson(localStorage.getItem('DspPatrol')).logoWebAddress;
    $scope.patrolName = angular.fromJson(localStorage.getItem('DspPatrol')).patrolName;
    $scope.close = function () {
        homeNavigator.popPage();
    };
    ons.ready(function () {
        return;
    });
});

/*
Trail status.
*/
module.controller('TrailStatusController', function ($scope, AccessLogService) {
    var data = angular.fromJson(localStorage.getItem('DspFacilities')),
        area = localStorage.getItem('OnsArea'),
        trails = [],
        n = 0,
        i = 0,
        j = 0,
        difficultyIconPath = '';
    AccessLogService.log('info', 'TrailStatus', area);
    $scope.area = area;
    $scope.trails = [];
    if (data) {
        for (i = 0; i < data.facilities.areas.area.length; i += 1) {
            if (data.facilities.areas.area[i].name === area && 'undefined' !== typeof data.facilities.areas.area[i].trails) {
                if (data.facilities.areas.area[i].trails.trail.constructor === Array) {
                    for (j = 0; j < data.facilities.areas.area[i].trails.trail.length; j += 1) {
                        trails[n] = {};
                        switch (data.facilities.areas.area[i].trails.trail[j].difficulty) {
                        case 'beginner':
                            difficultyIconPath = 'img/green.png';
                            break;
                        case 'intermediate':
                            difficultyIconPath = 'img/blue.png';
                            break;
                        case 'advancedIntermediate':
                            difficultyIconPath = 'img/blueblack.png';
                            break;
                        case 'advancedintermediate':
                            difficultyIconPath = 'img/blueblack.png';
                            break;
                        case 'intermediateadvanced':
                            difficultyIconPath = 'img/blueblack.png';
                            break;
                        case 'advanced':
                            difficultyIconPath = 'img/black.png';
                            break;
                        case 'expert':
                            difficultyIconPath = 'img/doubleblack.png';
                            break;
                        default:
                            difficultyIconPath = 'img/terrain.png';
                        }
                        trails[n].difficultyIconPath = difficultyIconPath;
                        trails[n].difficulty = data.facilities.areas.area[i].trails.trail[j].difficulty;
                        trails[n].name = data.facilities.areas.area[i].trails.trail[j].name;
                        if('yes' === data.facilities.areas.area[i].trails.trail[j].groomed) {
                            trails[n].grooming = true;
                        } else {
                            trails[n].grooming = false;
                        }
                        if ('open' === data.facilities.areas.area[i].trails.trail[j].status) {
                            trails[n].statusIcon = 'fa-check';
                            trails[n].statusIconColor = 'green';
                        } else {
                            trails[n].statusIcon = 'fa-ban';
                            trails[n].statusIconColor = 'red';
                        }
                        n = n + 1;
                    }
                } else {
                    trails[n] = {};
                    trails[n].name = data.facilities.areas.area[i].trails.trail.name;
                    trails[n].difficulty = data.facilities.areas.area[i].trails.trail.difficulty;
                    switch (trails[n].difficulty) {
                    case 'beginner':
                        trails[n].difficultyIcon = 'img/green.png';
                        break;
                    case 'intermediate':
                        trails[n].difficultyIcon = 'img/blue.png';
                        break;
                    case 'advancedIntermediate':
                        difficultyIconPath = 'img/blueblack.png';
                        break;
                    case 'advancedintermediate':
                        trails[n].difficultyIcon = 'img/blueblack.png';
                        break;
                    case 'intermediateadvanced':
                        trails[n].difficultyIcon = 'img/blueblack.png';
                        break;
                    case 'advanced':
                        trails[n].difficultyIcon = 'img/black.png';
                        break;
                    case 'expert':
                        trails[n].difficultyIcon = 'img/doubleblack.png';
                        break;
                    default:
                        trails[n].difficultyIcon = 'img/terrain.png';
                    }
                        if('yes' === data.facilities.areas.area[i].trails.trail[j].groomed) {
                            trails[n].grooming = true;
                        } else {
                            trails[n].grooming = false;
                        }
                    if ('open' === data.facilities.areas.area[i].trails.trail.status) {
                        trails[n].statusIcon = 'fa-check';
                        trails[n].statusIconColor = 'green';
                    } else {
                        trails[n].statusIcon = 'fa-ban';
                        trails[n].statusIconColor = 'red';
                    }
                    n = n + 1;
                }
            }
        }
    }
    $scope.trails = trails;
    $scope.logoAddress = angular.fromJson(localStorage.getItem('DspPatrol')).logoWebAddress;
    $scope.patrolName = angular.fromJson(localStorage.getItem('DspPatrol')).patrolName;
    $scope.close = function () {
        homeNavigator.popPage();
    };
    ons.ready(function () {
        return;
    });
});

/*
Live mountain cams.
*/
module.controller('LiveCamsController', function ($scope, AccessLogService) {
    var liveCam = angular.fromJson(localStorage.getItem('DspLiveCam')),
        territories = angular.fromJson(localStorage.getItem('DspTerritory')),
        mountainCamCount = 0,
        isMountainCam = false,
        i = 0,
        n = 0,
        liveCams = [];
    AccessLogService.log('info', 'LiveCams');
    if (liveCam && territories) {
        mountainCamCount = 0;
        for (i = 0; i < liveCam.length; i += 1) {
            isMountainCam = false;
            for (n = 0; n < territories.length; n += 1) {
                if (liveCam[i].territory === territories[n].code) {
                    if (territories[n].onResort === 'Yes') {
                        isMountainCam = true;
                    }
                }
            }
            if (isMountainCam) {
                liveCams[mountainCamCount] = liveCam[i];
                mountainCamCount += 1;
            }
        }
    }
    $scope.liveCams = [];
    liveCams.sort(function (a, b) {
        var sortVal = 0;
        if (a.name < b.name) {
            sortVal = -1;
        } else if (a.name > b.name) {
            sortVal = 1;
        }
        return sortVal;
    });
    $scope.liveCams = liveCams;
    $scope.logoAddress = angular.fromJson(localStorage.getItem('DspPatrol')).logoWebAddress;
    $scope.patrolName = angular.fromJson(localStorage.getItem('DspPatrol')).patrolName;
    $scope.view = function (index) {
        browse(liveCams[index].address);        
    };
    $scope.close = function () {
        homeNavigator.popPage();
    };
    ons.ready(function () {
        return;
    });
});

/*
Live Travel Cams.
*/
module.controller('TravelCamsController', function ($scope, AccessLogService) {
    var liveCam = angular.fromJson(localStorage.getItem('DspLiveCam')),
        territories = angular.fromJson(localStorage.getItem('DspTerritory')),
        travelCamCount = 0,
        isTravelCam = false,
        i = 0,
        n = 0,
        liveCams = [];
    AccessLogService.log('info', 'LiveCams');
    if (liveCam && territories) {
        travelCamCount = 0;
        for (i = 0; i < liveCam.length; i += 1) {
            isTravelCam = false;
            for (n = 0; n < territories.length; n += 1) {
                if (liveCam[i].territory === territories[n].code) {
                    if (territories[n].onResort !== 'Yes') {
                        isTravelCam = true;
                    }
                }
            }
            if (isTravelCam) {
                liveCams[travelCamCount] = liveCam[i];
                travelCamCount += 1;
            }
        }
    }
    $scope.liveCams = [];
    liveCams.sort(function (a, b) {
        var sortVal = 0;
        if (a.name < b.name) {
            sortVal = -1;
        } else if (a.name > b.name) {
            sortVal = 1;
        }
        return sortVal;
    });
    $scope.liveCams = liveCams;
    $scope.logoAddress = DSP_BASE_URL + '/api/v2' + angular.fromJson(localStorage.getItem('DspPatrol')).travelCamsLogoPath + '?api_key=' + DSP_API_KEY;
    console.log($scope.logoAddress);
    $scope.patrolName = angular.fromJson(localStorage.getItem('DspPatrol')).patrolName;
    $scope.view = function (index) {
        browse(liveCams[index].address);        
    };
    $scope.close = function () {
        homeNavigator.popPage();
    };
    ons.ready(function () {
        return;
    });
});

/*
Show terms of service legal mumbo jumbo.
*/
module.controller('RegTermsController', function ($scope, AccessLogService) {
    AccessLogService.log('info', 'RegTerms');
    $scope.close = function () {
        homeNavigator.popPage();            
    };
    ons.ready(function () {
        return;
    });
});

/*
Show privacy policy legal mumbo jumbo.
*/
module.controller('RegPrivacyController', function ($scope, AccessLogService) {
    AccessLogService.log('info', 'RegPrivacy');
    $scope.close = function () {
        homeNavigator.popPage();            
    };
    ons.ready(function () {
        return;
    });
});