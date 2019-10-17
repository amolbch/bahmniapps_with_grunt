'use strict';

angular.module('bahmni.registration')
    .directive('patientAction', ['$window', '$location', '$state', 'spinner', '$rootScope', '$stateParams',
        '$bahmniCookieStore', 'appService', 'visitService', 'sessionService', 'encounterService',
        'messagingService', '$translate', 'auditLogService', '$document',
        function ($window, $location, $state, spinner, $rootScope, $stateParams,
                  $bahmniCookieStore, appService, visitService, sessionService, encounterService,
                  messagingService, $translate, auditLogService, $document) {
            var controller = function ($scope, $timeout) {
                var self = this;
                var uuid = $stateParams.patientUuid;
                var editActionsConfig = appService.getAppDescriptor().getExtensions(Bahmni.Registration.Constants.nextStepConfigId, "config") || [];
                var conceptSetExtensions = appService.getAppDescriptor().getExtensions("org.bahmni.registration.conceptSetGroup.observations", "config");
                var loginLocationUuid = $bahmniCookieStore.get(Bahmni.Common.Constants.locationCookieName).uuid;
                var defaultVisitType = $rootScope.regEncounterConfiguration.getDefaultVisitType(loginLocationUuid);
                defaultVisitType = defaultVisitType || appService.getAppDescriptor().getConfigValue('defaultVisitType');
                var showStartVisitButton = appService.getAppDescriptor().getConfigValue("showStartVisitButton");
                var forwardUrlsForVisitTypes = appService.getAppDescriptor().getConfigValue("forwardUrlsForVisitTypes");
                showStartVisitButton = (_.isUndefined(showStartVisitButton) || _.isNull(showStartVisitButton)) ? true : showStartVisitButton;
                var visitLocationUuid = $rootScope.visitLocation;
                var forwardUrls = forwardUrlsForVisitTypes || false;
                $scope.visitTable = [];
                $scope.isEligibleForVisit = function () {
                    return $rootScope.isEligibleForVisit;
                };
                $scope.allVisits = $rootScope.regEncounterConfiguration.getVisitTypesAsArray();
                var getForwardUrlEntryForVisitFromTheConfig = function () {
                    var matchedEntry = _.find(forwardUrls, function (entry) {
                        if (self.hasActiveVisit) {
                            return entry.visitType === self.activeVisit.visitType.name;
                        }
                        return entry.visitType === $scope.visitControl.selectedVisitType.name;
                    });
                    return matchedEntry;
                };

                var keyForActiveVisitEntry = function () {
                    var matchedEntry = getForwardUrlEntryForVisitFromTheConfig();
                    if (matchedEntry) {
                        $scope.activeVisitConfig = matchedEntry;
                        if (_.isEmpty(_.get($scope.activeVisitConfig, 'translationKey'))) {
                            $scope.activeVisitConfig.translationKey = "REGISTRATION_LABEL_ENTER_VISIT";
                            $scope.activeVisitConfig.shortcutKey = "REGISTRATION_ENTER_VISIT_DETAILS_ACCESS_KEY";
                        }
                        return 'forwardAction';
                    }
                };

                function setForwardActionKey () {
                    if (editActionsConfig.length === 0) {
                        $scope.forwardActionKey = self.hasActiveVisit ? (getForwardUrlEntryForVisitFromTheConfig() ? keyForActiveVisitEntry() : 'enterVisitDetails') : 'startVisit';
                    } else {
                        $scope.actionConfig = editActionsConfig[0];
                        $scope.forwardActionKey = 'configAction';
                    }
                }

                var init = function () {
                    if (_.isEmpty(uuid)) {
                        self.hasActiveVisit = false;
                        setForwardActionKey();
                        return;
                    }
                    var searchParams = {
                        patient: uuid,
                        includeInactive: false,
                        v: "custom:(uuid,visitType,location:(uuid))"
                    };
                    spinner.forPromise(visitService.search(searchParams).then(function (response) {
                        var results = response.data.results;
                        var activeVisitForCurrentLoginLocation;
                        if (results) {
                            activeVisitForCurrentLoginLocation = _.filter(results, function (result) {
                                return result.location.uuid === visitLocationUuid;
                            });
                        }
                        self.hasActiveVisit = activeVisitForCurrentLoginLocation && (activeVisitForCurrentLoginLocation.length > 0);
                        if (self.hasActiveVisit) {
                            self.activeVisit = activeVisitForCurrentLoginLocation[0];
                        }
                        setForwardActionKey();
                        patientState();
                    }));
                };

                var getVisitHistory = function () {
                    var historyTable = [];
                    var visitTb = [];
                    return visitService.search({
                        patient: uuid,
                        v: 'custom:(uuid,visitType,startDatetime,stopDatetime,location,encounters:(uuid))',
                        includeInactive: true
                    })
                        .then(function (data) {
                            historyTable = data.data.results;

                            // get all visits, counts and date, location??
                            for (var i = 0; i <= historyTable.length; i++) {
                                if (historyTable[i] == undefined) {
                                } else {
                                    visitTb.push({
                                        "type": historyTable[i].visitType.display,
                                        "date": historyTable[i].stopDatetime,
                                        "encounters": historyTable[i].encounters.length
                                    });
                                }
                            }
                            $scope.visitTable = visitTb;
                        });
                };
                getVisitHistory();

                if (uuid == undefined) {
                    $scope.startVisits = [$scope.allVisits[0]];
                } else {
                    $scope.startVisits = [$scope.allVisits[0]];
                }

                $scope.visitControl = new Bahmni.Common.VisitControl(
                    $scope.startVisits, defaultVisitType, encounterService, $translate, visitService
                );

                $scope.visitControl.onStartVisit = function () {
                    $scope.setSubmitSource('startVisit');
                };

                var checkEmptyFields = function () {
                    $scope.countryValue = angular.element("#country")[0].value;
                    $scope.stateProvinceValue = angular.element("#stateProvince")[0].value;
                    $scope.cityVillageValue = angular.element("#cityVillage")[0].value;

                    if ($scope.countryValue === undefined || $scope.countryValue === "") {
                        angular.element("#country").addClass("illegalValue");
                    }
                    if ($scope.stateProvinceValue === undefined || $scope.stateProvinceValue === "") {
                        angular.element("#stateProvince").addClass("illegalValue");
                    }
                    if ($scope.cityVillageValue === undefined || $scope.cityVillageValue === "") {
                        angular.element("#cityVillage").addClass("illegalValue");
                    }
                };

                var validFields = function () {
                    if ($scope.myForms.myForm.country.$invalid || $scope.myForms.myForm.stateProvince.$invalid || $scope.myForms.myForm.cityVillage.$invalid) {
                        return false;
                    }
                    return true;
                };

                var patientState = function () {
                    if ($scope.patient.PATIENT_STATE_CHANGE == undefined || $scope.patient.PATIENT_STATE_CHANGE.value == 'Patient_Transferred_Out') {
                        $scope.canSave = true;
                    } else {
                        $scope.canSave = false;
                    }
                };

                patientState();

                $scope.setSubmitSource = function (source) {
                    if (!validFields()) {
                        $rootScope.isValidFields = false;
                    } else {
                        $rootScope.isValidFields = true;
                    }
                    $scope.submitted = true;
                    validFields();
                    checkEmptyFields();
                    $scope.actions.submitSource = source;
                };

                $scope.showStartVisitButton = function () {
                    return showStartVisitButton;
                };

                var goToForwardUrlPage = function (patientData) {
                    var forwardUrl = appService.getAppDescriptor().formatUrl($scope.activeVisitConfig.forwardUrl, {'patientUuid': patientData.patient.uuid});
                    $window.location.href = forwardUrl;
                };

                $scope.actions.followUpAction = function (patientProfileData) {
                    messagingService.clearAll();
                    switch ($scope.actions.submitSource) {
                    case 'startVisit':
                        var entry = getForwardUrlEntryForVisitFromTheConfig();
                        var forwardUrl = entry ? entry.forwardUrl : undefined;
                        return createVisit(patientProfileData, forwardUrl);
                    case 'forwardAction':
                        return goToForwardUrlPage(patientProfileData);
                    case 'enterVisitDetails':
                        return goToVisitPage(patientProfileData);
                    case 'configAction':
                        return handleConfigAction(patientProfileData);
                    case 'save':
                        $scope.afterSave();
                    }
                };

                var handleConfigAction = function (patientProfileData) {
                    var forwardUrl = appService.getAppDescriptor().formatUrl($scope.actionConfig.extensionParams.forwardUrl, {'patientUuid': patientProfileData.patient.uuid});
                    if (!self.hasActiveVisit) {
                        createVisit(patientProfileData, forwardUrl);
                    } else {
                        $window.location.href = forwardUrl;
                    }
                };

                var goToVisitPage = function (patientData) {
                    $scope.patient.uuid = patientData.patient.uuid;
                    $scope.patient.name = patientData.patient.person.names[0].display;
                    $location.path("/patient/" + patientData.patient.uuid + "/visit");
                };

                var isEmptyVisitLocation = function () {
                    return _.isEmpty($rootScope.visitLocation);
                };

                var createVisit = function (patientProfileData, forwardUrl) {
                    if (isEmptyVisitLocation()) {
                        $state.go('patient.edit', {patientUuid: $scope.patient.uuid}).then(function () {
                            messagingService.showMessage("error", "NO_LOCATION_TAGGED_TO_VISIT_LOCATION");
                        });
                        return;
                    }
                    spinner.forPromise($scope.visitControl.createVisitOnly(patientProfileData.patient.uuid, $rootScope.visitLocation).then(function (response) {
                        auditLogService.log(patientProfileData.patient.uuid, "OPEN_VISIT", {
                            visitUuid: response.data.uuid,
                            visitType: response.data.visitType.display
                        }, 'MODULE_LABEL_REGISTRATION_KEY');
                        if (forwardUrl) {
                            var updatedForwardUrl = appService.getAppDescriptor().formatUrl(forwardUrl, {'patientUuid': patientProfileData.patient.uuid});
                            $window.location.href = updatedForwardUrl;
                        } else {
                            goToVisitPage(patientProfileData);
                        }
                    }, function () {
                        $state.go('patient.edit', {patientUuid: $scope.patient.uuid});
                    }));
                };

                init();
            };
            return {
                restrict: 'E',
                templateUrl: 'views/patientAction.html',
                controller: controller
            };
        }
    ]);
