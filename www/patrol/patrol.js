/*jshint strict: true */
/*jshint unused: false */
/*jslint node: true */
/*jslint indent: 4 */
/*jslint unparam:true*/
/*global document, window, localStorage, ons, angular, module, moment, dspRequest, dial, sendEmail, niceMessage, patrolNavigator, havePatience, waitNoMore */
"use strict";

/*
Ski Patrol Mobile App
Copyright © 2014-2016, Gary Meyer.
All rights reserved.
*/

/*
Club together my upcoming stuff from shared events and my schedule.
*/
function upcomingStuff(events) {
    var i = 0,
        n = 0,
        stuff = [],
        yesterday = moment().subtract(24, 'hours');
    if (!events) {
        return [];
    }
    for (i = 0; i < events.length; i += 1) {
        if (moment(events[i].start) >= yesterday) {
            stuff[n] = events[i];
            stuff[n].quickTeaser = moment(events[i].start).format('ddd, MMM D') + ' - ' + events[i].activity;
            n += 1;
        }
    }
    stuff.sort(function (a, b) {
        var sortValue = 0;
        if (a.start < b.start) {
            sortValue = -1;
        } else if (a.start > b.start) {
            sortValue = 1;
        }
        return sortValue;
    });
    return stuff;
}

/*
Show patrol info.
*/
module.controller('PatrolController', function ($scope, $http, AccessLogService) {
    var patrolPrefix = localStorage.getItem('DspPatrolPrefix'),
        patrol = angular.fromJson(localStorage.getItem('DspPatrol')),
        role = localStorage.getItem('DspRole'),
        ads = angular.fromJson(localStorage.getItem('DspAd')),
        userId = localStorage.getItem('DspUserId'),
        patrollers = angular.fromJson(localStorage.getItem('DspPatroller')),
        patrollerRequest = dspRequest('GET', '/db/Patroller?order=name', null),
        categories = [],
        priorCategory,
        contents = angular.fromJson(localStorage.getItem('DspContent')),
        contentRequest = dspRequest('GET', '/db/Content?order=category,title', null),
        events = angular.fromJson(localStorage.getItem('DspEvent')),
        eventRequest = dspRequest('GET', '/db/Event?order=start,activity', null),
        activities = angular.fromJson(localStorage.getItem('DspActivity')),
        activityRequest = dspRequest('GET', '/db/Activity?order=activity', null),
        callRequest = dspRequest('GET', '/db/Phone?order=territory,name', null),
        nspOnlineUser = angular.fromJson(localStorage.getItem('NspOnlineUser')),
        nspOnlineUserRequest = dspRequest('GET', '/db/NspOnlineUser', null),
        i;
    AccessLogService.log('info', 'Patrol');
    if ('Leader' === role) {
        $scope.enableSignIn = true;
    }
    if ('Basic' === role || 'Power' === role || 'Leader' === role) {
        if (!contents) {
            contents = [];
        }
        for (i = 0; i < contents.length; i += 1) {
            if ((!priorCategory) || (priorCategory !== contents[i].category)) {
                categories.push({
                    "category": contents[i].category
                });
                priorCategory = contents[i].category;
            }
        }
        $scope.categories = categories;
        $scope.events = upcomingStuff(events);
        $scope.enablePatrolInfo = true;
        $http(patrollerRequest).
                success(function (data, status, headers, config) {
                    patrollers = data.record;
                    localStorage.setItem('DspPatroller', angular.toJson(patrollers));
                }).
                error(function (data, status, headers, config) {
                    AccessLogService.log('error', 'GetPatrollerErr', niceMessage(data, status));
                });
        eventRequest.cache = false;
        $http(contentRequest).
            success(function (data, status, headers, config) {
                contents = data.record;
                priorCategory = null;
                categories = [];
                localStorage.setItem('DspContent', angular.toJson(contents));
                for (i = 0; i < contents.length; i += 1) {
                    if ((!priorCategory) || (priorCategory !== contents[i].category)) {
                        categories.push({
                            "category": contents[i].category
                        });
                        priorCategory = contents[i].category;
                    }
                }
                $scope.categories = categories;
            }).
            error(function (data, status, headers, config) {
                AccessLogService.log('error', 'GetEventErr', niceMessage(data, status));
            });
        $http(eventRequest).
            success(function (data, status, headers, config) {
                events = data.record;
                localStorage.setItem('DspEvent', angular.toJson(events));
                $scope.events = upcomingStuff(events);
            }).
            error(function (data, status, headers, config) {
                AccessLogService.log('error', 'GetEventErr', niceMessage(data, status));
            });
        $http(activityRequest).
            success(function (data, status, headers, config) {
                activities = data.record;
                localStorage.setItem('DspActivity', angular.toJson(activities));
            }).
            error(function (data, status, headers, config) {
                AccessLogService.log('error', 'GetActivityErr', niceMessage(data, status));
            });
        if (patrol.nspOnlineResort) {
            $scope.enableNspOnline = true;
            $scope.enableNspLink = true;
            // HERE for authenticating against NSPOnline and pulling the stuff.
            $http(nspOnlineUserRequest).
                    success(function (data, status, headers, config) {
                        if (data.record.length > 0) {
                            AccessLogService.log('info', 'NspOnlineUser', nspOnlineUser);
                            nspOnlineUser = data.record[0];
                            localStorage.setItem('NspOnlineUser', angular.toJson(nspOnlineUser));
                            // TODO: Authenticate against NSP Online
                        } else {
                            AccessLogService.log('warn', 'NspOnlineUser', 'User has not linked NSP Online');
                            nspOnlineUser = null;
                            localStorage.removeItem('NspOnlineUser');
                        }
                    }).
                    error(function (data, status, headers, config) {
                        AccessLogService.log('error', 'GetNspOnlineUserErr', niceMessage(data, status));
                        nspOnlineUser = null;
                        localStorage.removeItem('NspOnlineUser');
                    });
        }
    } else {
        $scope.enableAd = false;
        if (ads && ('Yes' === patrol.showAds)) {
            for (i = 0; i < ads.length; i += 1) {
                if ('patrol' === ads[i].slot) {
                    $scope.adImageAddress = ads[i].imageAddress;
                    $scope.adLinkAddress = ads[i].linkAddress;
                    $scope.enableAd = true;
                }
            }
        }
        $scope.aGuest = true;
        $scope.items = angular.fromJson(localStorage.getItem('DspCall'));
        $http(callRequest).
            success(function (data, status, headers, config) {
                $scope.items = data.record;
                localStorage.setItem('DspCall', angular.toJson(data.record));
            }).
            error(function (data, status, headers, config) {
                AccessLogService.log('error', 'GetCallErr', niceMessage(data, status));
            });
    }
    $scope.adClick = function () {
        AccessLogService.log('info', 'AdClick', $scope.adLinkAddress);
        openAd($scope.adLinkAddress);
    };
    $scope.call = function (index) {
        dial($scope.items[index].number);
        AccessLogService.log('info', 'Call', $scope.items[index].number);
    };
    $scope.viewCategory = function (index) {
        localStorage.setItem('OnsCategory', categories[index].category);
        patrolNavigator.pushPage('patrol/contentcategory.html');
    };
    $scope.showEvent = function (index) {
        var role = localStorage.getItem('DspRole');
        localStorage.setItem('OnsEvent', angular.toJson($scope.events[index]));
        if ('Power' === role || 'Leader' === role) {
            patrolNavigator.pushPage('patrol/sheet.html');
        } else if ('Basic' === role) {
            patrolNavigator.pushPage('patrol/schedule.html');
        }
    };
    $scope.linkNspOnline = function (index) {
        patrolNavigator.pushPage('patrol/contentcategory.html');
    };
    ons.ready(function () {
        return;
    });
});

/*
Help the user call somebody really important.
*/
module.controller('CallController', function ($scope, $http, AccessLogService) {
    var patrolPrefix = localStorage.getItem('DspPatrolPrefix'),
        callRequest = dspRequest('GET', '/db/Phone?filter=displayInPatrolApp%3D%22Yes%22&order=territory%2Cname', null);
    AccessLogService.log('info', 'Call');
    $scope.items = angular.fromJson(localStorage.getItem('DspCall'));
    $http(callRequest).
        success(function (data, status, headers, config) {
            $scope.items = data.record;
            localStorage.setItem('DspCall', angular.toJson(data.record));
        }).
        error(function (data, status, headers, config) {
            AccessLogService.log('error', 'GetCallErr', niceMessage(data, status));
        });
    $scope.call = function (index) {
        dial($scope.items[index].number);
        AccessLogService.log('info', 'Call', $scope.items[index].number);
    };
    $scope.close = function () {
        patrolNavigator.popPage();
    };
    ons.ready(function () {
        return;
    });
});

/*
Search for a patroller.
*/
module.controller('SearchController', function ($scope, AccessLogService) {
    var patrollers = angular.fromJson(localStorage.getItem('DspPatroller'));
    AccessLogService.log('info', 'Search');
    $scope.patrollers = [];
    document.getElementById("name").focus();
    $scope.search = function (name) {
        var n = 0,
            i = 0;
        $scope.patrollers = [];
        name = name.toLowerCase();
        if ((name) && (name.length > 1)) {
            for (i = 0; i < patrollers.length; i += 1) {
                if ((patrollers[i].name) && (patrollers[i].name.toLowerCase().indexOf(name) > -1)) {
                    $scope.patrollers[n] = patrollers[i];
                    n += 1;
                }
            }
        }
    };
    $scope.view = function (index) {
        localStorage.setItem('OnsPatroller', angular.toJson($scope.patrollers[index]));
        patrolNavigator.pushPage('patrol/patroller.html');
    };
    $scope.close = function () {
        patrolNavigator.popPage();
    };
    ons.ready(function () {
        return;
    });
});

/*
Show patroller details.
*/
module.controller('PatrollerController', function ($scope, $http, AccessLogService) {
    var patrolPrefix = localStorage.getItem('DspPatrolPrefix'),
        patrol = angular.fromJson(localStorage.getItem('DspPatrol')),
        patroller = angular.fromJson(localStorage.getItem('OnsPatroller')),
        patrollers = angular.fromJson(localStorage.getItem('DspPatroller')),
        scheduleRequest = dspRequest('GET', '/db/Schedule?filter=patrollerId%3D' + patroller.id + '%20AND%20activityDate%3C%22' + moment().format('YYYY-MM-DD') + '%22&order=activityDate%20desc%2Cactivity', null),
        schedules,
        i;
    AccessLogService.log('info', 'Patroller', patroller.name);
    $scope.name = patroller.name;
    $scope.cellPhone = patroller.cellPhone;
    $scope.homePhone = patroller.homePhone;
    $scope.alternatePhone = patroller.alternatePhone;
    $scope.email = patroller.email;
    $scope.additionalEmail = patroller.additionalEmail;
    scheduleRequest.cache = false;
    $http(scheduleRequest).
        success(function (data, status, headers, config) {
            schedules = data.record;
            for (i = 0; i < schedules.length; i += 1) {
                schedules[i].displayDate = moment(schedules[i].activityDate).format('MMM D, YYYY');
                if ((schedules[i].duty.indexOf('OEC') > 0) || (schedules[i].duty.indexOf('CPR') > 0) || (schedules[i].duty.indexOf('Refresher') > 0)  || (schedules[i].duty.indexOf('Course') > 0) || (schedules[i].duty.indexOf('Training') > 0) || (schedules[i].duty.indexOf('Test') > 0) || (schedules[i].duty.indexOf('NSP') > 0)) {
                    schedules[i].summary = schedules[i].duty;
                } else {
                    schedules[i].summary = schedules[i].activity;
                }
            }
            $scope.showSchedule = true;
            $scope.schedules = schedules;
            if ((schedules) && (patrol.secretaryPatrollerId)) {
                for (i = 0; i < patrollers.length; i += 1) {
                    if (patrollers[i].id === patrol.secretaryPatrollerId) {
                        $scope.showSecretary = true;
                        $scope.secretaryName = patrollers[i].name;
                        $scope.secretaryEmail = patrollers[i].email;
                    }
                }
            }            
        }).
        error(function (data, status, headers, config) {
            $scope.message = niceMessage(data, status);
            AccessLogService.log('error', 'GetScheduleErr', niceMessage(data, status));
        });
    $scope.textCellPhone = function () {
        sms($scope.cellPhone);
    };
    $scope.callCellPhone = function () {
        dial($scope.cellPhone);
    };
    $scope.callHomePhone = function () {
        dial($scope.homePhone);
    };
    $scope.callAlternatePhone = function () {
        dial($scope.alternatePhone);
    };
    $scope.sendEmail = function () {
        sendEmail($scope.email, 'Ski%20Patrol');
    };
    $scope.sendAdditionalEmail = function () {
        sendEmail($scope.additionalEmail, 'Ski%20Patrol');
    };
    $scope.sendSecretaryEmail = function () {
        sendEmail($scope.secretaryEmail, 'Ski%20Patrol%20Days%20in%20App');
    };
    $scope.close = function () {
        patrolNavigator.popPage();
    };
    ons.ready(function () {
        return;
    });
});

/*
Content category.
*/
module.controller('ContentCategoryController', function ($scope, $http, AccessLogService) {
    var category = localStorage.getItem('OnsCategory'),
        contents = angular.fromJson(localStorage.getItem('DspContent')),
        categoryContents = [],
        i;
    AccessLogService.log('info', 'ContentCategory', category);
    for (i = 0; i < contents.length; i += 1) {
        if (contents[i].category === category) {
            categoryContents.push(contents[i]);
        }
    }
    $scope.category = category;
    $scope.contents = categoryContents;
    $scope.viewContent = function (index) {
        localStorage.setItem('OnsContent', angular.toJson(contents[index]));
        patrolNavigator.pushPage('patrol/patrolcontent.html');
    };
    $scope.close = function () {
        patrolNavigator.popPage();
    };
    ons.ready(function () {
        return;
    });
});

/*
Content.
*/
module.controller('PatrolContentController', function ($scope, $http, $sce, AccessLogService) {
    var content = angular.fromJson(localStorage.getItem('OnsContent'));
    AccessLogService.log('info', 'PatrolContent', content.title);
    $scope.title = content.title;
    $scope.body = $sce.trustAsHtml(content.body.replace(/(\r\n|\n|\r)/g, "<br />"));
    $scope.attachmentAddress = content.attachmentAddress;
    if (content.attachmentName) {
        $scope.attachmentName = content.attachmentName;
    } else {
        $scope.attachmentName = content.attachmentAddress;
    }
    $scope.close = function () {
        patrolNavigator.popPage();
    };
    $scope.openAttachment = function () {
        browse($scope.attachmentAddress);
    };
    ons.ready(function () {
        return;
    });
});

/*
Get all events.
*/
function patrolAllEvents(events) {
    var i = 0,
        n = 0,
        stuff = [];
    if (!events) {
        return [];
    }
    for (i = 0; i < events.length; i += 1) {
        stuff[n] = events[i];
        stuff[n].checked = false;
        stuff[n].quickTeaser = moment(events[i].start).format('ddd, MMM D') + ' - ' + events[i].activity;
        n = n + 1;
    }
    stuff.sort(function (a, b) {
        var sortValue = 0;
        if (a.start < b.start) {
            sortValue = -1;
        } else if (a.start > b.start) {
            sortValue = 1;
        }
        return sortValue;
    });
    return stuff;
}

/*
Edit the calendar.
*/
module.controller('CalendarController', function ($rootScope, $scope, $http, AccessLogService) {
    var patrolPrefix = localStorage.getItem('DspPatrolPrefix'),
        events = angular.fromJson(localStorage.getItem('DspEvent')),
        eventRequest = dspRequest('GET', '/db/Event?order=start,activity', null);
    AccessLogService.log('info', 'Calendar');
    eventRequest.cache = false;
    havePatience($rootScope);
    $http(eventRequest).
        success(function (data, status, headers, config) {
            events = data.record;
            localStorage.setItem('DspEvent', angular.toJson(events));
            if (!events) {
                patrolNavigator.popPage();
            } else {
                $scope.events = patrolAllEvents(events);
            }
            waitNoMore();
        }).
        error(function (data, status, headers, config) {
            AccessLogService.log('error', 'GetEventErr', niceMessage(data, status));
            waitNoMore();
        });
    $scope.pickEvent = function (index) {
        localStorage.setItem('OnsEvent', angular.toJson($scope.events[index]));
        patrolNavigator.pushPage('patrol/event.html');
    };
    $scope.close = function () {
        patrolNavigator.popPage();
    };
    ons.ready(function () {
        return;
    });
});

/*
Add a calendar event.
*/
module.controller('AddEventController', function ($rootScope, $scope, $http, AccessLogService) {
    var activities = angular.fromJson(localStorage.getItem('DspActivity')),
        now = moment(),
        i,
        activityList = [],
        n = 0;
    AccessLogService.log('info', 'AddEvent');
    $scope.date = now.format('ddd, MMM D');
    $scope.startDate = now.format('YYYY-MM-DD');
    $scope.endDate = now.format('YYYY-MM-DD');
    $scope.allDay = true;
    $scope.startAt = 0;
    $scope.startTime = null;
    $scope.endAt = 0;
    $scope.endTime = null;
    $scope.activity = {};
    for (i = 0; i < activities.length; i += 1) {
        activityList[n] = activities[i].activity;
        if ('Credit Day' === activityList[n]) {
            $scope.activity.activity = 'Credit Day';
        }
        n += 1;
    }
    if (!$scope.activity.activity) {
        $scope.activity.activity = $scope.activities[0];
    }
    $scope.description = null;
    $scope.location = null;
    $scope.address = null;
    $scope.activities = activityList;
    $scope.getDate = function () {
        var options = {
            date : moment($scope.startDate + ' 00:00:00').toDate(),
            mode : 'date',
            allowOldDates : true
        };
        window.plugins.datePicker.show(options, function (returnDate) {
            if (returnDate) {
                $scope.date = moment(returnDate).format('ddd, MMM D');
                $scope.startDate = moment(returnDate).format('YYYY-MM-DD');
                $scope.endDate = moment(returnDate).format('YYYY-MM-DD');
                $scope.$apply();
            }
        });
    };
    $scope.toggleAllDay = function () {
        $scope.allDay = !$scope.allDay;
    };
    $scope.getStartTime = function () {
        var options = {
            date : moment($scope.startDate + ' 00:00:00').toDate(),
            mode : 'time',
            allowOldDates : true
        };
        if ($scope.startAt) {
            options.date = moment($scope.startDate + ' ' + $scope.startAt).toDate();
        }
        window.plugins.datePicker.show(options, function (returnDate) {
            if (returnDate) {
                $scope.startAt = moment(returnDate).format('HH:mm:ss');
                $scope.startTime = moment(returnDate).format('h:mmA');
                $scope.$apply();
            }
        });
    };
    $scope.getEndTime = function () {
        var options = {
            date : moment($scope.endDate + ' 00:00:00').toDate(),
            mode : 'time',
            allowOldDates : true
        };
        if ($scope.endAt) {
            options.date = moment($scope.endDate + ' ' + $scope.endAt).toDate();
        }
        window.plugins.datePicker.show(options, function (returnDate) {
            if (returnDate) {
                $scope.endAt = moment(returnDate).format('HH:mm:ss');
                $scope.endTime = moment(returnDate).format('h:mmA');
                $scope.$apply();
            }
        });
    };
    $scope.add = function () {
        var patrolPrefix = localStorage.getItem('DspPatrolPrefix'),
            body = {
                tenantId: patrolPrefix,
                start: $scope.startDate + ' 00:00:00 UTC',
                end: null,
                allDay: 'Yes',
                activity: $scope.activity.activity,
                description: $scope.description,
                location: $scope.location,
                address: $scope.address
            },
            eventRequest;
        if (!$scope.allDay) {
            body.start = $scope.startDate + ' ' + $scopeStartAt + ' UTC';
            body.end = $scope.endDate + ' ' + $scopeEndAt + ' UTC';
            body.allDay = 'No';
        }
        eventRequest = dspRequest('POST', '/db/Event', body);
        havePatience($rootScope);
        $scope.message = '';
        $http(eventRequest).
            success(function (data, status, headers, config) {
                waitNoMore();
                patrolNavigator.pushPage('patrol/calendar.html');
            }).
            error(function (data, status, headers, config) {
                $scope.message = niceMessage(data, status);
                AccessLogService.log('error', 'PostEventErr', niceMessage(data, status));
                waitNoMore();
            });
    };
    $scope.close = function () {
        patrolNavigator.popPage();
    };
    ons.ready(function () {
        return;
    });
});

/*
Calendar event.
*/
module.controller('EventController', function ($rootScope, $scope, $http, AccessLogService) {
    var event = angular.fromJson(localStorage.getItem('OnsEvent')),
        activities = angular.fromJson(localStorage.getItem('DspActivity')),
        i,
        activityList = [];
    AccessLogService.log('info', 'Event');
    $scope.date = moment(event.start).format('ddd, MMM D');
    $scope.startDate = moment(event.start).format('YYYY-MM-DD');
    if ('No' === event.allDay) {
        $scope.endDate = moment(event.end).format('YYYY-MM-DD');
        $scope.allDay = false;
    } else {
        $scope.endDate = moment(event.start).format('YYYY-MM-DD');
        $scope.allDay = true;
    }
    $scope.startAt = moment(event.start).format('HH:mm:ss');
    $scope.startTime = moment(event.start).format('h:mmA');
    if (event.end) {
        $scope.endAt = moment(event.end).format('HH:mm:ss');
        $scope.endTime = moment(event.end).format('h:mmA');    
    } else {
        $scope.endAt = moment(event.start).format('HH:mm:ss');
        $scope.endTime = moment(event.start).format('h:mmA');    
    }
    for (i = 0; i < activities.length; i += 1) {
        activityList[i] = activities[i].activity;
    }
    $scope.activities = activityList;
    $scope.activity = {};
    $scope.activity.activity = event.activity;
    $scope.description = event.description;
    $scope.location = event.location;
    $scope.address = event.address;
    $scope.getDate = function () {
        var options = {
            date : moment($scope.startDate + ' 00:00:00').toDate(),
            mode : 'date',
            allowOldDates : true
        };
        window.plugins.datePicker.show(options, function (returnDate) {
            if (returnDate) {
                $scope.date = moment(returnDate).format('ddd, MMM D');
                $scope.startDate = moment(returnDate).format('YYYY-MM-DD');
                $scope.endDate = moment(returnDate).format('YYYY-MM-DD');
                $scope.$apply();
            }
        });
    };
    $scope.toggleAllDay = function () {
        $scope.allDay = !$scope.allDay;
    };
    $scope.getStartTime = function () {
        var options = {
            date : moment($scope.startDate + ' 00:00:00').toDate(),
            mode : 'time',
            allowOldDates : true
        };
        if ($scope.startAt) {
            options.date = moment($scope.startDate + ' ' + $scope.startAt).toDate();
        }
        window.plugins.datePicker.show(options, function (returnDate) {
            if (returnDate) {
                $scope.startAt = moment(returnDate).format('HH:mm:ss') + ' UTC';
                $scope.startTime = moment(returnDate).format('h:mmA');
                $scope.$apply();
            }
        });
    };
    $scope.getEndTime = function () {
        var options = {
            date : moment($scope.endDate + ' 00:00:00').toDate(),
            mode : 'time',
            allowOldDates : true
        };
        if ($scope.endAt) {
            options.date = moment($scope.endDate + ' ' + $scope.endAt).toDate();
        }
        window.plugins.datePicker.show(options, function (returnDate) {
            if (returnDate) {
                $scope.endAt = moment(returnDate).format('HH:mm:ss') + ' UTC';
                $scope.endTime = moment(returnDate).format('h:mmA');
                $scope.$apply();
            }
        });
    };
    $scope.update = function () {
        var patrolPrefix = localStorage.getItem('DspPatrolPrefix'),
            body = {
                start: $scope.startDate + ' 00:00:00 UTC',
                end: null,
                allDay: 'Yes',
                activity: $scope.activity.activity,
                description: $scope.description,
                location: $scope.location,
                address: $scope.address
            },
            eventRequest;
        if (!$scope.allDay) {
            body.start = $scope.startDate + ' ' + $scope.startAt + ' UTC';
            body.end = $scope.endDate + ' ' + $scope.endAt + ' UTC';
            body.allDay = 'No';
        }
        eventRequest = dspRequest('PUT', '/db/Event?ids=' + event.id, body);
        havePatience($rootScope);
        $scope.message = '';
        $http(eventRequest).
            success(function (data, status, headers, config) {
                waitNoMore();
                patrolNavigator.pushPage('patrol/calendar.html');
            }).
            error(function (data, status, headers, config) {
                $scope.message = niceMessage(data, status);
                AccessLogService.log('error', 'PutEventErr', niceMessage(data, status));
                waitNoMore();
            });
    };
    $scope.delete = function () {
        var patrolPrefix = localStorage.getItem('DspPatrolPrefix'),
            eventRequest = dspRequest('DELETE', '/db/Event?ids=' + event.id, null);
        havePatience($rootScope);
        $scope.message = '';
        $http(eventRequest).
            success(function (data, status, headers, config) {
                waitNoMore();
                patrolNavigator.pushPage('patrol/calendar.html');
            }).
            error(function (data, status, headers, config) {
                $scope.message = niceMessage(data, status);
                AccessLogService.log('error', 'PutEventErr', niceMessage(data, status));
                waitNoMore();
            });
    };
    $scope.close = function () {
        patrolNavigator.popPage();
    };
    ons.ready(function () {
        return;
    });
});

/*
Pick a day for a patrol leader.
*/
module.controller('LeadersController', function ($scope, AccessLogService) {
    var events = upcomingStuff(angular.fromJson(localStorage.getItem('DspEvent')), []);
    AccessLogService.log('info', 'Leaders');
    if (!events) {
        patrolNavigator.popPage();
    } else {
        $scope.events = upcomingStuff(events, []);
    }
    $scope.pickEvent = function (index) {
        events = upcomingStuff(angular.fromJson(localStorage.getItem('DspEvent')), []);
        localStorage.setItem('OnsEvent', angular.toJson(events[index]));
        patrolNavigator.pushPage('patrol/leader.html');
    };
    $scope.close = function () {
        patrolNavigator.popPage();
    };
    ons.ready(function () {
        return;
    });
});

/*
Assign patrol leader for a day.
*/
module.controller('LeaderController', function ($rootScope, $scope, $http, AccessLogService) {
    var event = angular.fromJson(localStorage.getItem('OnsEvent')),
        patrollers = angular.fromJson(localStorage.getItem('DspPatroller')),
        i;
    AccessLogService.log('info', 'Leader', event.start);
    $scope.quickTeaser = event.quickTeaser;
    if (event.patrolLeaderId) {
        for (i = 0; i < patrollers.length; i += 1) {
            if (event.patrolLeaderId === patrollers[i].id) {
                $scope.name = patrollers[i].name;
            }
        }
    }
    document.getElementById('name').focus();
    $scope.searchName = function (name) {
        var n = 0,
            i = 0;
        $scope.patrollers = [];
        if ((name) && (name.length > 1)) {
            name = name.toLowerCase();
            for (i = 0; i < patrollers.length; i += 1) {
                if ((patrollers[i].name) && (patrollers[i].name.toLowerCase().indexOf(name) > -1)) {
                    $scope.patrollers[n] = patrollers[i];
                    n = n + 1;
                }
            }
        } else {
            event.patrolLeaderId = null;
        }
    };
    $scope.listNames = function () {
        $scope.searchName($scope.name);
    };
    $scope.clearNames = function () {
        $scope.patrollers = [];
    };
    $scope.namePicked = function (patroller) {
        event.patrolLeaderId = patroller.id;
        $scope.name = patroller.name;
        $scope.patrollers = [];
    };
    $scope.update = function () {
        var patrolPrefix = localStorage.getItem('DspPatrolPrefix'),
            eventRequest = dspRequest('PUT', '/db/Event', event);
        havePatience($rootScope);
        $scope.message = '';
        $http(eventRequest).
            success(function (data, status, headers, config) {
                var events = angular.fromJson(localStorage.getItem('DspEvent')),
                    i;
                for (i = 0; i < events.length; i += 1) {
                    if (events[i].id === event.id) {
                        events[i].patrolLeaderId = event.patrolLeaderId;
                    }
                }
                localStorage.setItem('DspEvent', angular.toJson(events));
                localStorage.removeItem('OnsEvent');
                waitNoMore();
                patrolNavigator.pushPage('patrol/leaders.html');
            }).
            error(function (data, status, headers, config) {
                $scope.message = niceMessage(data, status);
                AccessLogService.log('error', 'PutEventErr', niceMessage(data, status));
                waitNoMore();
            });
    };
    $scope.remove = function () {
        event.patrolLeaderId = null;
        $scope.name = null;
        $scope.patrollers = [];
        $scope.update();
    };
    $scope.close = function () {
        patrolNavigator.pushPage('patrol/leaders.html');
    };
    $scope.back = function () {
        patrolNavigator.popPage();
    };
    ons.ready(function () {
        return;
    });
});

/*
Get the past events.
*/
function patrolPastEvents(events) {
    var i = 0,
        n = 0,
        stuff = [],
        thePresent = moment();
    if (!events) {
        return [];
    }
    for (i = 0; i < events.length; i += 1) {
        if (moment(events[i].start) <= thePresent) {
            stuff[n] = events[i];
            stuff[n].checked = false;
            stuff[n].quickTeaser = moment(events[i].start).format('ddd, MMM D') + ' - ' + events[i].activity;
            n = n + 1;
        }
    }
    stuff.sort(function (a, b) {
        var sortValue = 0;
        if (a.start > b.start) {
            sortValue = -1;
        } else if (a.start < b.start) {
            sortValue = 1;
        }
        return sortValue;
    });
    return stuff;
}

/*
Pick a day for a sign in sheet to edit.
*/
module.controller('SheetsController', function ($scope, AccessLogService) {
    var events = angular.fromJson(localStorage.getItem('DspEvent'));
    AccessLogService.log('info', 'Sheets');
    if (!events) {
        patrolNavigator.popPage();
    } else {
        $scope.events = patrolPastEvents(events);
    }
    $scope.pickEvent = function (index) {
        localStorage.setItem('OnsEvent', angular.toJson($scope.events[index]));
        patrolNavigator.pushPage('patrol/sheet.html');
    };
    $scope.close = function () {
        patrolNavigator.popPage();
    };
    ons.ready(function () {
        return;
    });
});

/*
Pick a patroller to edit on the sign in sheet.
*/
module.controller('SheetController', function ($rootScope, $scope, $http, AccessLogService) {
    var patrolPrefix = localStorage.getItem('DspPatrolPrefix'),
        event = angular.fromJson(localStorage.getItem('OnsEvent')),
        schedules = null,
        scheduleRequest = dspRequest('GET', '/db/Schedule?filter=' +
                'activityDate%3D%22' + encodeURIComponent(event.start) +
                '%22&activity%3D%22' + encodeURIComponent(event.activity) + '%22&order=name', null);
    havePatience($rootScope);
    AccessLogService.log('info', 'Sheet', event.start);
    $scope.quickTeaser = moment(event.start).format('ddd, MMM D') + ' - ' + event.activity;
    scheduleRequest.cache = false;
    $http(scheduleRequest).
        success(function (data, status, headers, config) {
            schedules = data.record;
            $scope.attendees = schedules;
            $scope.showAttendees = (schedules.length > 0);
            waitNoMore();
        }).
        error(function (data, status, headers, config) {
            AccessLogService.log('error', 'GetScheduleErr', niceMessage(data, status));
            waitNoMore();
        });
    $scope.edit = function (index) {
        localStorage.setItem('OnsSchedule', angular.toJson($scope.attendees[index]));
        patrolNavigator.pushPage('patrol/editsignin.html');
    };
    $scope.close = function () {
        patrolNavigator.pushPage('patrol/sheets.html');
    };
    $scope.back = function () {
        patrolNavigator.popPage();
    };
    ons.ready(function () {
        return;
    });
});

/*
Show an event.
*/
module.controller('ScheduleController', function ($rootScope, $scope, $http, AccessLogService) {
    var event = angular.fromJson(localStorage.getItem('OnsEvent'));
    AccessLogService.log('info', 'Schedule', event.start);
    $scope.quickTeaser = moment(event.start).format('ddd, MMM D') + ' - ' + event.activity;
    if ('No' === event.allDay) {
        $scope.times = moment(event.start).format('h:mmA') + ' - ' + moment(event.end).format('h:mmA');
    }
    $scope.description = event.description;
    $scope.location = event.location;
    $scope.address = event.address;
    $scope.close = function () {
        patrolNavigator.popPage();
    };
    ons.ready(function () {
        return;
    });
});

/*
Do a patroller sign in.
*/
module.controller('SignUpController', function ($rootScope, $scope, $http, AccessLogService) {
    var event = angular.fromJson(localStorage.getItem('OnsEvent')),
        activities = angular.fromJson(localStorage.getItem('DspActivity')),
        duty = angular.fromJson(localStorage.getItem('OnsDuty')),
        i,
        patrollers = angular.fromJson(localStorage.getItem('DspPatroller')),
        dutyList;
    AccessLogService.log('info', 'SignUp', event.start);
    $scope.quickTeaser = event.quickTeaser;
    for (i = 0; i < activities.length; i += 1) {
        if (activities[i].activity === event.activity) {
            $scope.credits = activities[i].defaultCredits;
            dutyList = activities[i].dutyListCsv.split(',');
        }
    }
    if (!duty && dutyList && dutyList.length > 0) {
        duty = dutyList[0];
    }
    $scope.duty = {};
    $scope.duty.duty = duty;
    if ($scope.duties && $scope.duties.length === 1) {
        $scope.duty.duty = $scope.duties[0];
    }
    document.getElementById('name').focus();
    $scope.showDutyList = function (name) {
        $scope.duties = dutyList;
        $scope.patrollers = [];
    };
    $scope.dutyPicked = function () {
        $scope.duties = [];
    };
    $scope.searchName = function (name) {
        var n = 0,
            i = 0;
        $scope.patrollers = [];
        if ((name) && (name.length > 1)) {
            name = name.toLowerCase();
            for (i = 0; i < patrollers.length; i += 1) {
                if ((patrollers[i].name) && (patrollers[i].name.toLowerCase().indexOf(name) > -1)) {
                    $scope.patrollers[n] = patrollers[i];
                    n = n + 1;
                }
            }
        }
    };
    $scope.listNames = function () {
        $scope.searchName($scope.name);
    };
    $scope.clearNames = function () {
        $scope.patrollers = [];
    };
    $scope.namePicked = function (patroller) {
        $scope.patrollerId = patroller.id;
        $scope.name = patroller.name;
        $scope.patrollers = [];
    };
    $scope.add = function () {
        var patrolPrefix = localStorage.getItem('DspPatrolPrefix'),
            body = {
                tenantId: patrolPrefix,
                patrollerId: $scope.patrollerId,
                name: $scope.name,
                activityDate: event.start,
                activity: event.activity,
                duty: $scope.duty.duty,
                equipment: $scope.equipment,
                comments: $scope.comments,
                credits: $scope.credits
            },
            scheduleRequest = dspRequest('POST', '/db/Schedule', body);
        if (!$scope.name) {
            $scope.message = 'Name is required.';
        } else {
            havePatience($rootScope);
            $scope.message = '';
            $http(scheduleRequest).
                success(function (data, status, headers, config) {
                    $scope.patrollerId = null;
                    $scope.name = null;
                    $scope.equipment = null;
                    $scope.comments = null;
                    waitNoMore();
                }).
                error(function (data, status, headers, config) {
                    $scope.message = niceMessage(data, status);
                    AccessLogService.log('error', 'PostScheduleErr', niceMessage(data, status));
                    waitNoMore();
                });
        }
    };
    $scope.cancel = function () {
        patrolNavigator.pushPage('patrol/sheet.html');
    };
    $scope.close = function () {
        patrolNavigator.pushPage('patrol/sheet.html');
    };
    $scope.back = function () {
        patrolNavigator.popPage();
    };
    ons.ready(function () {
        return;
    });
});

/*
Do a patroller sign in.
*/
module.controller('EditSignInController', function ($rootScope, $scope, $http, AccessLogService) {
    var patrolPrefix = localStorage.getItem('DspPatrolPrefix'),
        event = angular.fromJson(localStorage.getItem('OnsEvent')),
        activities = angular.fromJson(localStorage.getItem('DspActivity')),
        duty,
        i,
        dutyList,
        scheduleId = angular.fromJson(localStorage.getItem('OnsSchedule')).id,
        scheduleRequest = dspRequest('GET', '/db/Schedule?filter=' +
                'id%3D' + scheduleId, null),
        schedule;
    AccessLogService.log('info', 'EditSignIn', scheduleId);
    havePatience($rootScope);
    $scope.quickTeaser = event.quickTeaser;
    for (i = 0; i < activities.length; i += 1) {
        if (activities[i].activity === event.activity) {
            dutyList = activities[i].dutyListCsv.split(',');
        }
    }
    if ($scope.duties && $scope.duties.length === 1) {
        $scope.duty.duty = $scope.duties[0];
    }
    scheduleRequest.cache = false;
    $http(scheduleRequest).
        success(function (data, status, headers, config) {
            schedule = data.record[0];
            $scope.name = schedule.name;
            $scope.equipment = schedule.equipment;
            $scope.comments = schedule.comments;
            $scope.credits = schedule.credits;
            duty = schedule.duty;
            if (!duty && dutyList && dutyList.length > 0) {
                duty = dutyList[0];
            }
            $scope.duty = {};
            $scope.duty.duty = duty;
            waitNoMore();
        }).
        error(function (data, status, headers, config) {
            AccessLogService.log('error', 'GetScheduleErr', niceMessage(data, status));
            waitNoMore();
        });
    $scope.showDutyList = function (name) {
        $scope.duties = dutyList;
        $scope.patrollers = [];
    };
    $scope.dutyPicked = function () {
        $scope.duties = [];
    };
    $scope.update = function () {
        var patrolPrefix = localStorage.getItem('DspPatrolPrefix'),
            body = {
                id: schedule.id,
                patrollerId: schedule.patrollerId,
                name: schedule.name,
                activityDate: schedule.activityDate,
                activity: schedule.activity,
                duty: $scope.duty.duty,
                equipment: $scope.equipment,
                comments: $scope.comments,
                credits: $scope.credits
            },
            scheduleRequest = dspRequest('PUT', '/db/Schedule', body);
        havePatience($rootScope);
        $scope.message = '';
        $http(scheduleRequest).
            success(function (data, status, headers, config) {
                waitNoMore();
                patrolNavigator.pushPage('patrol/sheet.html');
            }).
            error(function (data, status, headers, config) {
                $scope.message = niceMessage(data, status);
                AccessLogService.log('error', 'PostScheduleErr', niceMessage(data, status));
                waitNoMore();
            });
    };
    $scope.remove = function () {
        var patrolPrefix = localStorage.getItem('DspPatrolPrefix'),
            scheduleRequest = dspRequest('DELETE', '/db/Schedule?ids%3D', schedule.id);
        havePatience($rootScope);
        $scope.message = '';
        $http(scheduleRequest).
            success(function (data, status, headers, config) {
                waitNoMore();
                patrolNavigator.pushPage('patrol/sheet.html');
            }).
            error(function (data, status, headers, config) {
                $scope.message = niceMessage(data, status);
                AccessLogService.log('error', 'DeleteScheduleErr', niceMessage(data, status));
                waitNoMore();
            });
    };
    $scope.close = function () {
        patrolNavigator.pushPage('patrol/sheet.html');
    };
    $scope.back = function () {
        patrolNavigator.popPage();
    };
    ons.ready(function () {
        return;
    });
});