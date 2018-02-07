/*jshint strict: true */
/*jshint unused: false */
/*jslint node: true */
/*jslint indent: 4 */
/*jslint unparam:true */
/*global IN_CORDOVA, device, localStorage, ons, angular, module, dspRequest, personalNavigator, openAd, havePatience, waitNoMore, niceMessage, sendEmail */
"use strict";

/*
Ski Patrol Mobile App
Copyright © 2014-2018, Gary Meyer.
All rights reserved.
*/

/*
Personal patroller stuff.
*/
module.controller('PersonalController', function ($scope, $http, AccessLogService) {
    var ads = angular.fromJson(localStorage.getItem('DspAd')),
        patrolPrefix = localStorage.getItem('DspPatrolPrefix'),
        patrol = angular.fromJson(localStorage.getItem('DspPatrol')),
        role = localStorage.getItem('DspRole'),
        profile = angular.fromJson(localStorage.getItem('DspProfile')),
        profileRequest = dspRequest('GET', '/user/profile', null),
        patroller = angular.fromJson(localStorage.getItem('OnsMyPatroller')),
        patrollerRequest = null,
        roles = angular.fromJson(localStorage.getItem('OnsMyRoles')),
        roleNames = [],
        rolesRequest = null,
        patrollerQuals = angular.fromJson(localStorage.getItem('OnsPatrollerQuals')),
        patrollerQualsRequest = null,
        trainings = [],
        documentations = [],
        financials = [],
        resources = [],
        i;
    AccessLogService.log('info', 'Personal');
    $scope.enableAd = false;
    if (('Guest' == role) && (ads) && ('Yes' === patrol.showAds)) {
        for (i = 0; i < ads.length; i += 1) {
            if ('personal' === ads[i].slot) {
                $scope.adImageAddress = ads[i].imageAddress;
                $scope.adLinkAddress = ads[i].linkAddress;
                $scope.enableAd = true;
            }
        }
    }
    if (patrol) {
        $scope.showDemographics = true;
        if (profile) {
            $scope.name = profile.first_name;
            $scope.showDemographics = true;
            $scope.showProfile = true;
            if (patroller) {
                $scope.status = patroller.status;
                if ((roles) && (roles.length > 0)) {
                    for (i = 0; i < roles.length; i += 1) {
                        roleNames.push(roles[i].role);
                    }
                    $scope.status += ' - ' + roleNames.join('/');
                }
                $scope.showPatroller = true;
            } else {
                $scope.showPatroller = false;
            }
        } else {
            $scope.showDemographics = false;
            $scope.showProfile = false;
            $scope.showPatroller = false;
        }
        $http(profileRequest).
            success(function (data, status, headers, config) {
                $scope.name = data.first_name;
                $scope.showDemographics = true;
                $scope.showProfile = true;
                localStorage.setItem('DspProfile', angular.toJson(data));
                patrollerRequest = dspRequest('GET', '/team/_table/Patroller?filter=(email%20%3D%20' + data.email + ')%20or%20(email%20%3D%20' + data.additionalEmail + ')', null);
                $http(patrollerRequest).
                    success(function (data, status, headers, config) {
                        if (1 === data.resource.length) {
                            $scope.status = data.resource[0].status;
                            $scope.showPatroller = true;
                            localStorage.setItem('OnsMyPatroller', angular.toJson(data.resource[0]));
                            rolesRequest = dspRequest('GET', '/team/_table/PatrollerRole?filter=patrollerId%20%3D%20' + data.resource[0].id, null);
                            roleNames = [];
                            $http(rolesRequest).
                                success(function (data, status, headers, config) {
                                    if (data.resource.length > 0) {
                                        for (i = 0; i < data.resource.length; i += 1) {
                                            roleNames.push(data.resource[i].role);
                                        }
                                        $scope.status += ' - ' + roleNames.join('/');
                                    }
                                    localStorage.setItem('OnsMyRoles', angular.toJson(data.resource));
                                }).
                                error(function (data, status, headers, config) {
                                    AccessLogService.log('err', 'GetMyPatrollerRolesErr', data);
                                });
                            // Begin Quals
                            patrollerQualsRequest = dspRequest('GET', '/team/_table/PatrollerQualStatus?filter=id%20%3D%20' + data.resource[0].id + '&order=qualificationType%2CqualificationDescription', null);
                            $http(patrollerQualsRequest).
                                success(function (data, status, headers, config) {
                                    console.debug(angular.toJson(data));
                                    localStorage.setItem('OnsMyQuals', angular.toJson(data.resource));
                                    if (data.resource.length > 0) {
                                        for (i = 0; i < data.resource.length; i += 1) {
                                            switch (data.resource[i].qualificationType) {
                                                case 'Training':
                                                    trainings.push(data.resource[i]);
                                                    break;
                                                case 'Documentation':
                                                    documentations.push(data.resource[i]);
                                                    break;
                                                case 'Financial':
                                                    financials.push(data.resource[i]);
                                                    break;
                                                case 'Resource':
                                                    resources.push(data.resource[i]);
                                                    break;
                                            }
                                        }
                                        // TODO put into $scope and that                                        
                                    }
                                }).
                                error(function (data, status, headers, config) {
                                    AccessLogService.log('err', 'GetMyQualsErr', data);
                                });
                            // End Quals
                        } else {
                            $scope.showPatroller('warn', 'GetMyPatrollerWarn', 'Patroller not found for email ' + data.email + '/' + data.additionalEmail);
                        }
                    }).
                    error(function (data, status, headers, config) {
                        $scope.showPatroller = false;
                        AccessLogService.log('err', 'GetMyPatrollerErr', data);
                    });
            }).
            error(function (data, status, headers, config) {
                $scope.name = '';
                $scope.showDemographics = false;
                $scope.showProfile = false;
                AccessLogService.log('warn', 'GetProfileErr', data);
            });
    } else {
        $scope.showDemographics = false;
        $scope.showProfile = false;
        $scope.showPatroller = false;
    }
    ons.ready(function () {
        return;
    });
});

/*
Show patroller demographic details.
*/
module.controller('DemographicsController', function ($scope, $http, AccessLogService) {
    var patrol = angular.fromJson(localStorage.getItem('DspPatrol')),
        patrollers = angular.fromJson(localStorage.getItem('DspPatroller')),
        patroller = angular.fromJson(localStorage.getItem('OnsMyPatroller')),
        i = null;
    AccessLogService.log('info', 'Demographics', patroller.name);
    $scope.name = patroller.name;
    $scope.address = patroller.address;
    $scope.cellPhone = patroller.cellPhone;
    $scope.homePhone = patroller.homePhone;
    $scope.alternatePhone = patroller.alternatePhone;
    $scope.email = patroller.email;
    $scope.additionalEmail = patroller.additionalEmail;
    $scope.nspId = patroller.nspId;
    $scope.passOption = patroller.passOption;
    $scope.dependents = patroller.dependents;
    $scope.notes = patroller.notes;
    if (patrol.secretaryPatrollerId) {
        for (i = 0; i < patrollers.length; i += 1) {
            if (patrollers[i].id === patrol.secretaryPatrollerId) {
                $scope.showSecretary = true;
                $scope.secretaryName = patrollers[i].name;
                $scope.secretaryEmail = patrollers[i].email;
            }
        }
    }
    $scope.sendSecretaryEmail = function () {
        sendEmail($scope.secretaryEmail, 'Ski%20Patrol%20Contact%20Info');
    };
    $scope.close = function () {
        personalNavigator.popPage();
    };
    ons.ready(function () {
        return;
    });
});

/*
Show patroller status and benefits details.
*/
module.controller('StatusController', function ($scope, $http, AccessLogService) {
    var patrol = angular.fromJson(localStorage.getItem('DspPatrol')),
        patrollers = angular.fromJson(localStorage.getItem('DspPatroller')),
        patroller = angular.fromJson(localStorage.getItem('OnsMyPatroller')),
        roles = angular.fromJson(localStorage.getItem('OnsMyRoles')),
        roleNames = [],
        i = null;
    AccessLogService.log('info', 'Status', patroller.name);
    $scope.status = patroller.status;
    if ((roles) && (roles.length > 0)) {
        for (i = 0; i < roles.length; i += 1) {
            roleNames.push(roles[i].role);
        }
        $scope.status += ' - ' + roleNames.join('/');
    }
    $scope.passOption = patroller.passOption;
    $scope.dependents = patroller.dependents;
    if (patrol.secretaryPatrollerId) {
        for (i = 0; i < patrollers.length; i += 1) {
            if (patrollers[i].id === patrol.secretaryPatrollerId) {
                $scope.showSecretary = true;
                $scope.secretaryName = patrollers[i].name;
                $scope.secretaryEmail = patrollers[i].email;
            }
        }
    }
    $scope.sendSecretaryEmail = function () {
        sendEmail($scope.secretaryEmail, 'Ski%20Patrol%20Status%20and%20Benefits');
    };
    $scope.close = function () {
        personalNavigator.popPage();
    };
    ons.ready(function () {
        return;
    });
});