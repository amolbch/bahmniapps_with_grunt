'use strict';

angular.module('bahmni.clinical')
    .directive('visitsTable', ['patientVisitHistoryService', 'conceptSetService', 'spinner', '$state', '$q', 'encounterService', 'providerService',
        function (patientVisitHistoryService, conceptSetService, spinner, $state, $q, encounterService, providerService) {
            var controller = function ($scope) {
                var emitNoDataPresentEvent = function () {
                    $scope.$emit("no-data-present-event");
                };
                $scope.openVisit = function (key) {
                    var visit = $scope.visits[key];
                    if ($scope.$parent.closeThisDialog) {
                        $scope.$parent.closeThisDialog("closing modal");
                    }
                    $state.go('patient.dashboard.visit', {visitUuid: visit.uuid});
                };

                $scope.hasVisits = function () {
                    return $scope.visits && $scope.visits.length > 0;
                };

                $scope.params = angular.extend(
                    {
                        maximumNoOfVisits: 4,
                        title: "Visits"
                    }, $scope.params);

                $scope.noVisitsMessage = "No Visits for this patient.";

                $scope.toggle = function (visit) {
                    visit.isOpen = !visit.isOpen;
                    visit.cacheOpenedHtml = true;
                };

                $scope.filteredObservations = function (observation, observationTemplates) {
                    var observationTemplateArray = [];
                    for (var observationTemplateIndex in observationTemplates) {
                        observationTemplateArray.push(observationTemplates[observationTemplateIndex].display);
                    }

                    var obsArrayFiltered = [];
                    for (var ob in observation) {
                        if (_.includes(observationTemplateArray, observation[ob].concept.display)) {
                            obsArrayFiltered.push(observation[ob]);
                        }
                    }
                    return obsArrayFiltered;
                };

                $scope.editConsultation = function (encounter) {
                    showNotApplicablePopup();
                    if ($scope.$parent.closeThisDialog) {
                        $scope.$parent.closeThisDialog("closing modal");
                    }
                    $state.go('patient.dashboard.show.observations', {
                        conceptSetGroupName: "observations",
                        encounterUuid: encounter.uuid
                    });
                };

                $scope.getDisplayName = function (data) {
                    var concept = data.concept;
                    var displayName = data.concept.displayString;
                    if (concept.names && concept.names.length === 1 && concept.names[0].name !== "") {
                        displayName = concept.names[0].name;
                    } else if (concept.names && concept.names.length === 2) {
                        displayName = _.find(concept.names, {conceptNameType: "SHORT"}).name;
                    }
                    return displayName;
                };

                $scope.getProviderDisplayName = function (encounter) {
                    return encounter.encounterProviders.length > 0 ? encounter.encounterProviders[0].provider.display : null;
                };

                var getVisits = function () {
                    return patientVisitHistoryService.getVisitHistory($scope.patientUuid);
                };

                var getAllProviders = function () {
                    var params = {v: "custom:(display,person,uuid,retired,attributes:(attributeType:(display),value,voided))"};
                    return providerService.list(params).then(function (response) {
                        return _.filter(response.data.results);
                    });
                };

                var init = function () {
                    return $q.all([getVisits(), getAllProviders()]).then(function (results) {
                        $scope.visits = results[0].visits;
                        var consultationEncounters = [];
                        var APSSProviderUuids = [];
                        var clinicalProviderUuids = [];
                        var allProviders = results[1];
                        var APSSEncounters = [];
                        var clinicalEncounters = [];

                        _.map(allProviders, function (current) {
                            if (current.attributes.length > 0) {
                                _.map(current.attributes, function (obj) {
                                    if (obj.attributeType.display == 'APSS') {
                                        if (obj.value === true && obj.voided === false) {
                                            APSSProviderUuids.push(current.uuid);
                                        }
                                    } else if (obj.attributeType.display == 'Clinical') {
                                        if (obj.value === true && obj.voided === false) {
                                            clinicalProviderUuids.push(current.uuid);
                                        }
                                    }
                                });
                            }
                        });

                        _.map($scope.visits, function (current) {
                            _.map(current.encounters, function (obj) {
                                if (obj.encounterType.display === 'Consultation') {
                                    consultationEncounters.push(obj);
                                }
                            });
                        });

                        for (var i = 0; i < consultationEncounters.length; i++) {
                            if (_.includes(APSSProviderUuids, consultationEncounters[i].encounterProviders[0].uuid)) {
                                APSSEncounters.push(consultationEncounters[i]);
                            }
                            else if (_.includes(clinicalProviderUuids, consultationEncounters[i].encounterProviders[0].uuid)) {
                                clinicalEncounters.push(consultationEncounters[i]);
                            }
                        }

                        var appsTracker = new Map();
                        var clinicalTracker = new Map();

                        for (var i = 0; i < APSSEncounters.length; i++) {
                            if (i == APSSEncounters.length - 1) {
                                if (appsTracker.get(APSSEncounters[i].visit.uuid) !== undefined) {
                                    var position = appsTracker.get(APSSEncounters[i].visit.uuid);
                                    APSSEncounters[position].actualEncounterType = undefined;
                                }
                                APSSEncounters[i].actualEncounterType = "ENCOUNTER_APSS_FIRST";
                                appsTracker.set(APSSEncounters[i].visit.uuid, i);
                            }
                            else {
                                if (appsTracker.get(APSSEncounters[i].visit.uuid) === undefined) {
                                    APSSEncounters[i].actualEncounterType = "ENCOUNTER_APSS_FOLLOWUP";
                                    appsTracker.set(APSSEncounters[i].visit.uuid, i);
                                }
                            }
                        }

                        for (var i = 0; i < clinicalEncounters.length; i++) {
                            if (i == clinicalEncounters.length - 1) {
                                if (clinicalTracker.get(clinicalEncounters[i].visit.uuid) !== undefined) {
                                    var j = clinicalTracker.get(clinicalEncounters[i].visit.uuid);
                                    clinicalEncounters[j].actualEncounterType = undefined;
                                }
                                clinicalEncounters[i].actualEncounterType = "ENCOUNTER_CLINICAL_FIRST";
                                clinicalTracker.set(clinicalEncounters[i].visit.uuid, i);
                            }
                            else {
                                if (clinicalTracker.get(clinicalEncounters[i].visit.uuid) === undefined) {
                                    clinicalEncounters[i].actualEncounterType = "ENCOUNTER_CLINICAL_FOLLOWUP";
                                    clinicalTracker.set(clinicalEncounters[i].visit.uuid, i);
                                }
                            }
                        }

                        $scope.visits = _.map($scope.visits, function (current) {
                            if (current.stopDatetime) {
                                if (current.encounters.length > 1) {
                                    current.visitStatus = "VISIT_STATUS_FINISHED";
                                    return current;
                                }
                                if (current.visitType.display === "Special OPD" || current.visitType.display === "SPECIAL_OPD" || current.visitType.display === "SPECIAL OPD") {
                                    current.visitStatus = "VISIT_STATUS_FINISHED";
                                    return current;
                                }
                                current.visitStatus = "VISIT_STATUS_ABSENT";
                                return current;
                            }
                            current.visitStatus = "VISIT_STATUS_PROGRESS";
                            return current;
                        });
                        $scope.patient = {uuid: $scope.patientUuid};
                        if (!$scope.hasVisits()) emitNoDataPresentEvent();
                    });
                };

                $scope.initialization = init();

                $scope.params = angular.extend(
                    {
                        maximumNoOfVisits: 4,
                        title: "Visits"
                    }, $scope.params);

                $scope.noVisitsMessage = "No Visits for this patient.";
            };
            var link = function ($scope, element) {
                spinner.forPromise($scope.initialization, element);
            };

            return {
                restrict: 'E',
                link: link,
                controller: controller,
                templateUrl: "displaycontrols/allvisits/views/visitsTable.html",
                scope: {
                    params: "=",
                    patientUuid: "="
                }
            };
        }]);
