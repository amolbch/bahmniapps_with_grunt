'use strict';

angular.module('bahmni.common.displaycontrol.forms')
    .directive('formsTable', ['conceptSetService', 'spinner', '$q', 'visitFormService', 'appService', '$state', '$rootScope', 'providerService', 'providerTypeService',
        function (conceptSetService, spinner, $q, visitFormService, appService, $state, $rootScope, providerService, providerTypeService) {
            var controller = function ($scope) {
                $scope.shouldPromptBrowserReload = true;
                $scope.showFormsDate = appService.getAppDescriptor().getConfigValue("showFormsDate");
                var clinicalProviderForms = appService.getAppDescriptor().getConfigValue('clinicalProviderForms');
                var APSSProviderForms = appService.getAppDescriptor().getConfigValue('APSSProviderForms');
                var allProviders, finalFormsToDisplay;
                var getAllObservationTemplates = function () {
                    return conceptSetService.getConcept({
                        name: "All Observation Templates",
                        v: "custom:(setMembers:(display))"
                    });
                };

                $scope.isFormEditable = true;
                if ($scope.patient.patientState) {
                    if ($scope.patient.patientState == 'INACTIVE_SUSPENDED' || $scope.patient.patientState == 'INACTIVE_TRANSFERRED_OUT' || $scope.patient.patientState == 'INACTIVE_DEATH') {
                        $scope.isFormEditable = false;
                    } else {
                        $scope.isFormEditable = true;
                    }
                } else {
                    $scope.isFormEditable = true;
                }

                var obsFormData = function () {
                    return visitFormService.formData($scope.patient.uuid, $scope.section.dashboardConfig.maximumNoOfVisits, $scope.section.formGroup, $state.params.enrollment);
                };

                var filterFormData = function (formData) {
                    var filterList = [];
                    _.each(formData, function (item) {
                        var foundElement = _.find(filterList, function (filteredItem) {
                            return item.concept.uuid == filteredItem.concept.uuid;
                        });
                        if (foundElement == undefined) {
                            filterList.push(item);
                        }
                    });
                    return filterList;
                };

                var sortedFormDataByLatestDate = function (formData) {
                    return _.sortBy(formData, "obsDatetime").reverse();
                };

                var init = function () {
                    $scope.noFormFoundMessage = "No Form found for this patient";
                    $scope.isFormFound = false;
                    var currentProvider = $rootScope.currentProvider;
                    return $q.all([getAllObservationTemplates(), obsFormData(), providerService.getProviderAttributes(currentProvider.uuid)]).then(function (results) {
                        $scope.observationTemplates = results[0].data.results[0].setMembers;
                        var sortedFormDataByDate = sortedFormDataByLatestDate(results[1].data.results);
                        /* sortedFormDataByDate = _.filter(_.map(sortedFormDataByDate, function (currentForm) {
                            if (_.includes(finalFormsToDisplay, currentForm.concept.name.name)) {
                                return currentForm;
                            }
                        })); */

                        var providerAttributes;

                        if (results[2].data) {
                            providerAttributes = results[2].data.results;
                        }

                        var providerType = providerTypeService.getProviderType(providerAttributes)[0];

                        if (providerType == "APSS") {
                            finalFormsToDisplay = APSSProviderForms;
                        } else if (providerType == "Clinical") {
                            finalFormsToDisplay = clinicalProviderForms;
                        }

                        if ($scope.isOnDashboard) {
                            $scope.formData = filterFormData(sortedFormDataByDate);
                        } else {
                            $scope.formData = sortedFormDataByDate;
                        }

                        if ($scope.formData.length == 0) {
                            $scope.isFormFound = true;
                            $scope.$emit("no-data-present-event");
                        }
                    });
                };

                $scope.getDisplayName = function (data) {
                    var concept = data.concept;
                    var displayName = data.concept.displayString;
                    if (concept.names && concept.names.length === 1 && concept.names[0].name != "") {
                        displayName = concept.names[0].name;
                    } else if (concept.names && concept.names.length === 2) {
                        var shortName = _.find(concept.names, {conceptNameType: "SHORT"});
                        displayName = shortName && shortName.name ? shortName.name : displayName;
                    }
                    return displayName;
                };

                $scope.initialization = init();

                $scope.getEditObsData = function (observation) {
                    return {
                        observation: observation,
                        conceptSetName: observation.concept.displayString,
                        conceptDisplayName: $scope.getDisplayName(observation)
                    };
                };
                $scope.shouldPromptBeforeClose = true;

                $scope.getConfigToFetchDataAndShow = function (data) {
                    return {
                        patient: $scope.patient,
                        config: {
                            conceptNames: [data.concept.displayString],
                            showGroupDateTime: false,
                            encounterUuid: data.encounterUuid,
                            observationUuid: data.uuid
                        },
                        section: {
                            title: data.concept.displayString
                        }
                    };
                };

                $scope.dialogData = {
                    "patient": $scope.patient,
                    "section": $scope.section
                };
            };

            var link = function ($scope, element) {
                spinner.forPromise($scope.initialization, element);
            };

            return {
                restrict: 'E',
                controller: controller,
                link: link,
                templateUrl: "../common/displaycontrols/forms/views/formsTable.html",
                scope: {
                    section: "=",
                    patient: "=",
                    isOnDashboard: "="
                }
            };
        }
    ]);

