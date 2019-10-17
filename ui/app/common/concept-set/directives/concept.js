'use strict';

angular.module('bahmni.common.conceptSet')
    .directive('concept', ['RecursionHelper', 'spinner', '$filter', 'messagingService', '$http', '$timeout', 'bmiCalculationService', '$rootScope', '$translate',
        function (RecursionHelper, spinner, $filter, messagingService, $http, $timeout, bmiCalculationService, $rootScope, $translate) {
            var height, weight, brachialPerimeter, bmi, data, key, isValidHeight, startDateProphylaxis, enDateProphylaxis, treatmentStartDate, treatmentEndDate, answer, tuberculosisData, prophylaxisData;

            var link = function (scope) {
                var dateUtil = Bahmni.Common.Util.DateUtil;
                var patientUuid = scope.patient.uuid;
                var dataSource = " ";
                var eligibleForBP = false;
                var gender = scope.patient.gender;
                var patientAgeYears = scope.patient.age;
                var patientAgeDays = scope.patient.ageDays;
                var patientAgeMonths = scope.patient.ageMonths;
                var deliveryDateResponse;
                var isPatientPregnant;
                var valueRangeMessage = $translate.instant("VALUE_RANGE_MESSAGE");
                var ageToMonths = (patientAgeYears * 12) + patientAgeMonths;
                var hideAbnormalbuttonConfig = scope.observation && scope.observation.conceptUIConfig && scope.observation.conceptUIConfig['hideAbnormalButton'];
                var currentUrl = window.location.href;
                scope.currentDate = $filter("date")(dateUtil.now(), 'yyyy-MM-dd');
                weight = scope.patient.weight;
                height = scope.patient.height;

                scope.onDateChange = function () {
                    scope.today = dateUtil.getDateWithoutTime(dateUtil.now());
                    if (scope.observation.concept.name === "SP_Treatment Start Date") {
                        treatmentStartDate = scope.observation.value;
                    }
                    if (scope.observation.concept.name === "SP_Treatment End Date") {
                        treatmentEndDate = scope.observation.value;
                    }
                    if (scope.observation.concept.name === "Start Date_Prophylaxis") {
                        startDateProphylaxis = scope.observation.value;
                    }
                    if (scope.observation.concept.name === "End Date") {
                        enDateProphylaxis = scope.observation.value;
                    }

                    if (treatmentStartDate === '') {
                        answer = null;
                        $rootScope.observationData.toggleSelectionTBState(answer);
                    }
                    if (treatmentStartDate === scope.today) {
                        answer = tuberculosisData[0];
                        $rootScope.observationData.toggleSelectionTBState(answer);
                    }
                    if (treatmentStartDate < scope.today && treatmentStartDate !== '') {
                        answer = tuberculosisData[1];
                        $rootScope.observationData.toggleSelectionTBState(answer);
                    }
                    if ((treatmentEndDate <= scope.today) && (treatmentEndDate >= treatmentStartDate) && (treatmentEndDate !== '')) {
                        answer = tuberculosisData[2];
                        $rootScope.observationData.toggleSelectionTBState(answer);
                    }

                    if (startDateProphylaxis === '') {
                        answer = null;
                        $rootScope.prophylaxisObservationData.toggleSelectionProphylaxisState(answer);
                    }
                    if (prophylaxisData !== undefined) {
                        if (startDateProphylaxis === scope.today) {
                            answer = prophylaxisData[0];
                            $rootScope.prophylaxisObservationData.toggleSelectionProphylaxisState(answer);
                        }
                        if (startDateProphylaxis < scope.today && startDateProphylaxis !== '') {
                            answer = prophylaxisData[1];
                            $rootScope.prophylaxisObservationData.toggleSelectionProphylaxisState(answer);
                        }
                        if ((enDateProphylaxis <= scope.today) && (enDateProphylaxis >= startDateProphylaxis) && (enDateProphylaxis !== '')) {
                            answer = prophylaxisData[2];
                            $rootScope.prophylaxisObservationData.toggleSelectionProphylaxisState(answer);
                        }
                    }

                    if (treatmentStartDate > treatmentEndDate && treatmentEndDate !== '') {
                        messagingService.showMessage('error', "INVALID_TREATMENT_END_DATE");
                        angular.element("#observation_40").css("border", "1px solid red");
                        angular.element("#observation_40").css("background", "#ffcdcd");
                        angular.element("#observation_40").css("outline", "0");
                    } else {
                        angular.element("#observation_40").css("border", "1px solid #DDD");
                        angular.element("#observation_40").css("background", "#fff");
                        angular.element("#observation_40").css("outline", "0");
                    }
                    if (startDateProphylaxis > enDateProphylaxis && enDateProphylaxis !== '') {
                        messagingService.showMessage('error', "INVALID_TREATMENT_END_DATE");
                        angular.element("#observation_45").css("border", "1px solid red");
                        angular.element("#observation_45").css("background", "#ffcdcd");
                        angular.element("#observation_45").css("outline", "0");

                        angular.element("#observation_51").css("border", "1px solid red");
                        angular.element("#observation_51").css("background", "#ffcdcd");
                        angular.element("#observation_51").css("outline", "0");

                        angular.element("#observation_57").css("border", "1px solid red");
                        angular.element("#observation_57").css("background", "#ffcdcd");
                        angular.element("#observation_57").css("outline", "0");
                    } else {
                        angular.element("#observation_45").css("border", "1px solid #DDD");
                        angular.element("#observation_45").css("background", "#fff");
                        angular.element("#observation_45").css("outline", "0");

                        angular.element("#observation_51").css("border", "1px solid #DDD");
                        angular.element("#observation_51").css("background", "#fff");
                        angular.element("#observation_51").css("outline", "0");

                        angular.element("#observation_57").css("border", "1px solid #DDD");
                        angular.element("#observation_57").css("background", "#fff");
                        angular.element("#observation_57").css("outline", "0");
                    }
                };

                scope.onVitalSignalChange = function () {
                    if (scope.observation.concept.name === 'Blood_Pressure_–_Diastolic_VSNew') {
                        var bloodPressureDiastolic = scope.observation.value;
                        if ((bloodPressureDiastolic >= 60 && bloodPressureDiastolic <= 80) || bloodPressureDiastolic === undefined) {
                            scope.hideAbnormalButton = true;
                        } else {
                            scope.hideAbnormalButton = false;
                        }
                    }

                    if (scope.observation.concept.name === 'Blood_Pressure_–_Systolic_VitalS') {
                        var bloodPressureSystolic = scope.observation.value;
                        if ((bloodPressureSystolic >= 90 && bloodPressureSystolic <= 120) || bloodPressureSystolic === undefined) {
                            scope.hideAbnormalButton = true;
                        } else {
                            scope.hideAbnormalButton = false;
                        }
                    }

                    if (scope.observation.concept.name === 'Heart_Rate_VS_VitalsNew') {
                        var heartRate = scope.observation.value;
                        if ((heartRate >= 60 && heartRate <= 100) || heartRate === undefined) {
                            scope.hideAbnormalButton = true;
                        } else {
                            scope.hideAbnormalButton = false;
                        }
                    }

                    if (scope.observation.concept.name === 'Temperature_VS1') {
                        var temperature = scope.observation.value;
                        if ((temperature >= 36.5 && temperature <= 37.5) || temperature === undefined) {
                            scope.hideAbnormalButton = true;
                        } else {
                            scope.hideAbnormalButton = false;
                        }
                    }
                };

                if (scope.observation !== null && scope.observation !== undefined && currentUrl.includes("registration")) {
                    scope.observation.value = "";
                }
                if (scope.observation !== null && scope.observation !== undefined && currentUrl.includes("clinical")) {
                    if (scope.observation.concept.name === "WEIGHT" && (scope.observation.value === null || scope.observation.value === undefined)) {
                        scope.observation.value = scope.patient.weight;
                    }
                    if (scope.observation.concept.name === "HEIGHT" && (scope.observation.value === null || scope.observation.value === undefined)) {
                        scope.observation.value = scope.patient.height;
                    }

                    if (scope.observation.concept.name === "BMI") {
                        scope.observation.disabled = true;
                    }

                    if (scope.conceptSetName === 'Group V-Screening / Prophylaxis') {
                        if (scope.observation.concept.name === 'SP_Treatment State') {
                            $rootScope.observationData = scope.observation;
                            tuberculosisData = scope.observation.possibleAnswers;
                        }

                        if (scope.observation.concept.name === 'INH_Details' || scope.observation.concept.name === 'CTZ_Details' || scope.observation.concept.name === 'Fluconazol_Details') {
                            $rootScope.prophylaxisObservationData = scope.observation.groupMembers[1];
                            prophylaxisData = $rootScope.prophylaxisObservationData.possibleAnswers;
                        }
                    }

                    if (scope.conceptSetName === 'Clinical_Observation_form') {
                        if (scope.observation.concept.name === 'Blood_Pressure_–_Diastolic_VSNew') {
                            var bloodPressureDiastolic = scope.observation.value;
                            if ((bloodPressureDiastolic >= 60 && bloodPressureDiastolic <= 80) || bloodPressureDiastolic === undefined) {
                                scope.hideAbnormalButton = true;
                            } else {
                                scope.hideAbnormalButton = false;
                            }
                        }

                        if (scope.observation.concept.name === 'Blood_Pressure_–_Systolic_VitalS') {
                            var bloodPressureSystolic = scope.observation.value;
                            if ((bloodPressureSystolic >= 90 && bloodPressureSystolic <= 120) || bloodPressureSystolic === undefined) {
                                scope.hideAbnormalButton = true;
                            } else {
                                scope.hideAbnormalButton = false;
                            }
                        }

                        if (scope.observation.concept.name === 'Heart_Rate_VS_VitalsNew') {
                            var heartRate = scope.observation.value;
                            if ((heartRate >= 60 && heartRate <= 100) || heartRate === undefined) {
                                scope.hideAbnormalButton = true;
                            } else {
                                scope.hideAbnormalButton = false;
                            }
                        }

                        if (scope.observation.concept.name === 'Temperature_VS1') {
                            var temperature = scope.observation.value;
                            if ((temperature >= 36.5 && temperature <= 37.5) || temperature === undefined) {
                                scope.hideAbnormalButton = true;
                            } else {
                                scope.hideAbnormalButton = false;
                            }
                        }
                    }
                }

                scope.nutritionalStateDisplay = $rootScope.nutritionalStatusObject || "CLINICAL_NO_NUTRITIONAL_STATUS";
                scope.nutritionalState = $rootScope.nutritionalStatus;
                scope.$watch('rootObservation', function (newValue, oldValue) {
                    if (oldValue != newValue) {
                        if (scope.patient.weight && scope.patient.height) {
                            bmi = (scope.patient.weight / (scope.patient.height * scope.patient.height)) * 10000;
                        }

                        _.map(scope.rootObservation.groupMembers, function (currentObj) {
                            if (currentObj.concept.name == 'Anthropometric') {
                                _.map(currentObj.groupMembers, function (obj) {
                                    if (obj.concept.name == 'BMI' && bmi !== undefined) {
                                        _.defer(function () {
                                            scope.$apply(function () {
                                                obj.value = parseFloat(bmi.toFixed(2));
                                            });
                                        });
                                    }
                                });
                            }
                        });
                        if (!scope.observation.value) {
                            key = bmiCalculationService.getNutritionalStatusKey(patientAgeYears, bmi, gender, scope.patient.height, scope.patient.weight) || scope.nutritionalState;

                            data = _.filter(_.map(scope.rootObservation.groupMembers, function (currentObj) {
                                if (currentObj.concept.name == 'Anthropometric') {
                                    return _.filter(_.map(currentObj.groupMembers, function (obj) {
                                        if (obj.concept.name == 'Nutritional_States_new') {
                                            return _.filter(_.map(obj.possibleAnswers, function (curObj) {
                                                if (curObj.name.name == key) {
                                                    return curObj;
                                                }
                                            }));
                                        }
                                    }));
                                }
                            }));

                            _.map(scope.rootObservation.groupMembers, function (currentObj) {
                                if (currentObj.concept.name == 'Anthropometric') {
                                    _.map(currentObj.groupMembers, function (obj) {
                                        if (obj.concept.name == 'Nutritional_States_new') {
                                            _.defer(function () {
                                                scope.$apply(function () {
                                                    obj.value = data[0][0][0];
                                                });
                                            });
                                        }
                                    });
                                }
                            });
                        }
                    }
                });

                scope.now = moment().format("YYYY-MM-DD hh:mm:ss");
                scope.showTitle = scope.showTitle === undefined ? true : scope.showTitle;
                scope.hideAbnormalButton = hideAbnormalbuttonConfig == undefined ? scope.hideAbnormalButton : hideAbnormalbuttonConfig;
                scope.cloneNew = function (observation, parentObservation) {
                    observation.showAddMoreButton = function () {
                        return false;
                    };
                    var newObs = observation.cloneNew();
                    newObs.scrollToElement = true;
                    var index = parentObservation.groupMembers.indexOf(observation);
                    parentObservation.groupMembers.splice(index + 1, 0, newObs);
                    messagingService.showMessage("info", "Uma nova secção " + observation.label + " foi adicionada");
                    scope.$root.$broadcast("event:addMore", newObs);
                };

                scope.removeClonedObs = function (observation, parentObservation) {
                    observation.voided = true;
                    var lastObservationByLabel = _.findLast(parentObservation.groupMembers, function (groupMember) {
                        return groupMember.label === observation.label && !groupMember.voided;
                    });

                    lastObservationByLabel.showAddMoreButton = function () { return true; };
                    observation.hidden = true;
                };

                scope.isClone = function (observation, parentObservation) {
                    if (parentObservation && parentObservation.groupMembers) {
                        var index = parentObservation.groupMembers.indexOf(observation);
                        return (index > 0) ? parentObservation.groupMembers[index].label == parentObservation.groupMembers[index - 1].label : false;
                    }
                    return false;
                };

                scope.isRemoveValid = function (observation) {
                    if (observation.getControlType() == 'image') {
                        return !observation.value;
                    }
                    return true;
                };

                scope.getStringValue = function (observations) {
                    return observations.map(function (observation) {
                        return observation.value + ' (' + $filter('bahmniDate')(observation.date) + ")";
                    }).join(", ");
                };

                scope.toggleSection = function () {
                    scope.collapse = !scope.collapse;
                };

                scope.isCollapsibleSet = function () {
                    return scope.showTitle == true;
                };

                scope.hasPDFAsValue = function () {
                    return scope.observation.value && (scope.observation.value.indexOf(".pdf") > 0);
                };

                scope.$watch('collapseInnerSections', function () {
                    scope.collapse = scope.collapseInnerSections && scope.collapseInnerSections.value;
                });
                scope.handleUpdate = function () {
                    var currentEnteredDate;
                    var date = "";
                    if (scope.observation.concept.name == 'Last Menstruation Date') {
                        _.map(scope.rootObservation.groupMembers, function (currentObj) {
                            if (currentObj.concept.name == 'Probable delivery date') {
                                currentObj.value = date;
                                return currentObj;
                            }
                            if (currentObj.concept.name == 'Pregnancy_Yes_No') {
                                currentObj.value = null;
                                return currentObj;
                            }
                        });
                    }
                    if (scope.observation.concept.name == 'Pregnancy_Yes_No') {
                        _.map(scope.rootObservation.groupMembers, function (currentObj) {
                            if (currentObj.concept.name == 'Last Menstruation Date') {
                                currentEnteredDate = currentObj.value;
                            }
                            if (currentObj.concept.name == 'Probable delivery date') {
                                if (scope.observation.value) {
                                    currentEnteredDate = moment(currentEnteredDate).add(9, 'M');
                                    currentEnteredDate = moment(currentEnteredDate).add(7, 'days');
                                    currentEnteredDate = moment(currentEnteredDate).format('YYYY-MM-DD');
                                    currentObj.value = currentEnteredDate;
                                } else {
                                    currentObj.value = date;
                                }

                                return currentObj;
                            }
                            return currentObj;
                        });
                    }
                    scope.$root.$broadcast("event:observationUpdated-" + scope.conceptSetName, scope.observation.concept.name, scope.rootObservation);
                };

                var getPregnancyStatus = function (patientUuid) {
                    return $http.get(Bahmni.Common.Constants.observationsUrl, {
                        params: {
                            concept: "Pregnancy_Yes_No",
                            numberOfVisits: 1,
                            patientUuid: patientUuid
                        },
                        withCredentials: true
                    });
                };

                var getDeliveryDate = function (patientUuid) {
                    return $http.get(Bahmni.Common.Constants.observationsUrl, {
                        params: {
                            concept: "Date of Delivery",
                            numberOfVisits: 1,
                            patientUuid: patientUuid
                        },
                        withCredentials: true
                    });
                };

                var getAnswerObject = function (key, value) {
                    if (value) {
                        data = _.filter(_.map(scope.rootObservation.groupMembers, function (currentObj) {
                            if (currentObj.concept.name == 'Nutritional_States_new') {
                                return _.filter(_.map(currentObj.possibleAnswers, function (curObj) {
                                    if (curObj.name.name == key) {
                                        return curObj;
                                    }
                                }));
                            }
                        }));

                        if (data[0].length == 0) {
                            messagingService.showMessage("error", valueRangeMessage);
                        } else {
                            messagingService.clearAll();
                        }

                        _.map(scope.rootObservation.groupMembers, function (currentObj) {
                            if (currentObj.concept.name == 'Nutritional_States_new') {
                                scope.$apply(function () {
                                    currentObj.value = data[0][0];
                                });
                            }

                            if (currentObj.concept.name == 'BMI') {
                                scope.$apply(function () {
                                    currentObj.value = parseFloat(bmi.toFixed(2));
                                });
                            }
                        });
                    }
                    else {
                        _.map(scope.rootObservation.groupMembers, function (currentObj) {
                            if (currentObj.concept.name == 'Nutritional_States_new') {
                                scope.$apply(function () {
                                    currentObj.value = undefined;
                                });
                            }

                            if (currentObj.concept.name == 'BMI') {
                                scope.$apply(function () {
                                    currentObj.value = '';
                                });
                            }
                        });
                    }
                };

                scope.updateNutritionalValue = async function () {
                    if (scope.conceptSetName == 'Clinical_Observation_form') {
                        if (scope.observation.concept.name == 'WEIGHT') {
                            weight = scope.observation.value;
                            scope.patient.weight = undefined;
                        }

                        if (scope.observation.concept.name == 'HEIGHT') {
                            height = scope.observation.value;
                            scope.patient.weight = undefined;
                        }

                        if (scope.observation.concept.name == 'Brachial_perimeter_new') {
                            brachialPerimeter = scope.observation.value;
                        }
                        if (weight && height) {
                            bmi = (weight / (height * height)) * 10000;
                        }

                        var pregnancyResponse = await getPregnancyStatus(patientUuid);

                        if (pregnancyResponse.data.length > 0) {
                            isPatientPregnant = pregnancyResponse.data[0].value;
                        }
                        var sixMonthsAgoDate;
                        deliveryDateResponse = await getDeliveryDate(patientUuid);
                        if (deliveryDateResponse.data.length > 0) {
                            deliveryDateResponse = deliveryDateResponse.data[0].value;
                        }

                        var actualDeliveryDate = moment(new Date(deliveryDateResponse));
                        var todayDate = moment(new Date());

                        sixMonthsAgoDate = moment(new Date()).subtract(6, 'M');

                        if (actualDeliveryDate.isBetween(sixMonthsAgoDate, todayDate)) {
                            eligibleForBP = true;
                        }

                        if (ageToMonths >= 6 && ageToMonths <= 59) {
                            eligibleForBP = true;
                        }
                        if ((!height || !weight)) {
                            getAnswerObject(key, null);
                            bmi = 0;
                            return;
                        }

                        if (!height && !weight && !brachialPerimeter) {
                            getAnswerObject(key, null);
                            bmi = 0;
                            return;
                        }

                        if ((isPatientPregnant || eligibleForBP) && brachialPerimeter) {
                            if (brachialPerimeter >= 23) {
                                key = "CO_Normal";
                            }

                            if (brachialPerimeter >= 21 && brachialPerimeter < 23) {
                                key = "CO_SAM";
                            }

                            if (brachialPerimeter < 21) {
                                key = "CO_MAM";
                            }

                            getAnswerObject(key, brachialPerimeter);
                            return;
                        }
                        else if (bmi) {
                            key = bmiCalculationService.getNutritionalStatusKey(patientAgeYears, bmi, gender, height, weight);
                            getAnswerObject(key, bmi);
                        }
                    }
                };

                scope.update = function (value) {
                    if (scope.getBooleanResult(scope.observation.isObservationNode)) {
                        scope.observation.primaryObs.value = value;
                    } else if (scope.getBooleanResult(scope.observation.isFormElement())) {
                        scope.observation.value = value;
                    }
                    scope.handleUpdate();
                };

                scope.getBooleanResult = function (value) {
                    return !!value;
                };

                scope.hideField = function (conceptName) {
                    if (scope.patient.gender === 'M' && conceptName === 'Gynecology/Obstetrics') {
                        return true;
                    }
                    if (scope.patient.patientStatus != 'Pre TARV' && conceptName === 'Apss_Prepared_start_ARV_treatment') {
                        return true;
                    }
                    return false;
                };
            };

            var compile = function (element) {
                return RecursionHelper.compile(element, link);
            };

            return {
                restrict: 'E',
                compile: compile,
                scope: {
                    conceptSetName: "=",
                    observation: "=",
                    atLeastOneValueIsSet: "=",
                    showTitle: "=",
                    conceptSetRequired: "=",
                    rootObservation: "=",
                    patient: "=",
                    nutritionalStateDisplay: "&",
                    collapseInnerSections: "=",
                    rootConcept: "&",
                    hideAbnormalButton: "="
                },
                templateUrl: '../common/concept-set/views/observation.html'
            };
        }]);
