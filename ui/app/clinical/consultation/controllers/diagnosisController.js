'use strict';

angular.module('bahmni.clinical')
    .controller('DiagnosisController', ['$scope', '$rootScope', 'diagnosisService', 'configurations', 'messagingService', 'contextChangeHandler', 'spinner', 'appService', '$translate', 'retrospectiveEntryService', '$http',
        function ($scope, $rootScope, diagnosisService, configurations, messagingService, contextChangeHandler, spinner, appService, $translate, retrospectiveEntryService, $http) {
            var DateUtil = Bahmni.Common.Util.DateUtil;
            $scope.todayWithoutTime = DateUtil.getDateWithoutTime(DateUtil.today());
            $scope.toggles = {
                expandInactive: false
            };
            $scope.consultation.whoStage = $scope.consultation.whoStage || null;
            var fetchLastObs = $http.get(Bahmni.Common.Constants.observationsUrl, {
                params: {
                    concept: Bahmni.Common.Constants.whoStageConceptName,
                    patientUuid: $scope.patient.uuid
                },
                withCredentials: true
            });
            fetchLastObs = fetchLastObs.then(function (response) {
                $scope.consultation.currentStage = response;
                if (response.data.length > 0) {
                    mapWhoStageObs(response.data[0]);
                }
            });

            $scope.consultation.stages = configurations.whoStageConcept() || null;
            $scope.consultation.condition = $scope.consultation.condition || new Bahmni.Common.Domain.Condition({});
            $scope.consultation.allergy = $scope.consultation.allergy || new Bahmni.Common.Domain.Allergy({});
            $scope.conditionsStatuses = {
                'CONDITION_LIST_ACTIVE': 'ACTIVE',
                'CONDITION_LIST_INACTIVE': 'INACTIVE',
                'CONDITION_LIST_HISTORY_OF': 'HISTORY_OF'
            };
            $scope.allergiesStatuses = {
                'ALLERGIES_LIST_ACTIVE': 'ACTIVE'
            };
            $scope.consultation.followUpConditions = $scope.consultation.followUpConditions || [];
            $scope.consultation.followUpAllergies = $scope.consultation.followUpAllergies || [];

            _.forEach($scope.consultation.conditions, function (condition) {
                condition.isFollowUp = _.some($scope.consultation.followUpConditions, {value: condition.uuid});
            });

            _.forEach($scope.consultation.allergies, function (allergy) {
                allergy.isFollowUp = _.some($scope.consultation.followUpAllergies, {value: allergy.uuid});
            });

            $scope.placeholder = "Add Diagnosis";
            $scope.hasAnswers = false;

            $scope.orderOptions = {
                'CLINICAL_DIAGNOSIS_ORDER_PRIMARY': 'PRIMARY',
                'CLINICAL_DIAGNOSIS_ORDER_SECONDARY': 'SECONDARY'
            };
            $scope.certaintyOptions = {
                'CLINICAL_DIAGNOSIS_CERTAINTY_CONFIRMED': 'CONFIRMED',
                'CLINICAL_DIAGNOSIS_CERTAINTY_PRESUMED': 'PRESUMED'
            };

            $scope.getDiagnosis = function (params) {
                return diagnosisService.getAllFor(params.term).then(mapConcept);
            };

            $scope.getConditions = function (params) {
                return diagnosisService.getAllConditionsFor(params.term).then(mapConcept);
            };

            $scope.getAllergyDiagnosis = function (params) {
                return diagnosisService.getAllForAllergy(params.term).then(mapConcept);
            };

            var _canAdd = function (diagnosis) {
                var canAdd = true;
                $scope.consultation.newlyAddedDiagnoses.forEach(function (observation) {
                    if (observation.codedAnswer.uuid === diagnosis.codedAnswer.uuid) {
                        canAdd = false;
                    }
                });
                return canAdd;
            };

            $scope.getAddNewDiagnosisMethod = function (diagnosisAtIndex) {
                return function (item) {
                    var concept = item.lookup;
                    var index = $scope.consultation.newlyAddedDiagnoses.indexOf(diagnosisAtIndex);
                    var diagnosisBeingEdited = $scope.consultation.newlyAddedDiagnoses[index];
                    var diagnosis = new Bahmni.Common.Domain.Diagnosis(concept, diagnosisBeingEdited.order,
                        diagnosisBeingEdited.certainty, diagnosisBeingEdited.existingObs);
                    if (_canAdd(diagnosis)) {
                        /* TODO:
                         change to say array[index]=newObj instead array.splice(index,1,newObj);
                         */
                        $scope.consultation.newlyAddedDiagnoses.splice(index, 1, diagnosis);
                    }
                };
            };

            var addPlaceHolderDiagnosis = function () {
                var diagnosis = new Bahmni.Common.Domain.Diagnosis('');
                $scope.consultation.newlyAddedDiagnoses.push(diagnosis);
            };

            var findPrivilege = function (privilegeName) {
                return _.find($rootScope.currentUser.privileges, function (privilege) {
                    return privilegeName === privilege.name;
                });
            };

            var init = function () {
                $scope.canDeleteDiagnosis = findPrivilege(Bahmni.Common.Constants.deleteDiagnosisPrivilege);
                $scope.allowOnlyCodedDiagnosis = appService.getAppDescriptor().getConfig("allowOnlyCodedDiagnosis") &&
                                                 appService.getAppDescriptor().getConfig("allowOnlyCodedDiagnosis").value;
                $scope.hideConditions = appService.getAppDescriptor().getConfigValue("hideConditions");
                addPlaceHolderDiagnosis();
                diagnosisService.getDiagnosisConceptSet().then(function (result) {
                    $scope.diagnosisMetaData = result.data.results[0];
                    $scope.isStatusConfigured = function () {
                        var memberFound = _.find($scope.diagnosisMetaData.setMembers, function (member) {
                            return member.name.name === 'Bahmni Diagnosis Status';
                        });
                        return memberFound !== undefined;
                    };
                });
            };

            $scope.checkInvalidDiagnoses = function () {
                $scope.errorMessage = "";
                $scope.consultation.newlyAddedDiagnoses.forEach(function (diagnosis) {
                    if (isInvalidDiagnosis(diagnosis)) {
                        $scope.errorMessage = "{{'CLINICAL_DUPLICATE_DIAGNOSIS_ERROR_MESSAGE' | translate }}";
                    }
                });
            };

            $scope.checkInvalidConditions = function () {
                // Should check first, before adding class but as the system only accepts on-select values then check is skipped
                angular.element("#condition").addClass('illegalValue');
            };

            $scope.checkInvalidAllergies = function (consultation) {
                // Should check first, before adding class but as the system only accepts on-select values then check is skipped
                angular.element("#allergy").addClass('illegalValue');
            };

            var isInvalidDiagnosis = function (diagnosis) {
                var codedAnswers = _.map(_.remove(_.map($scope.consultation.newlyAddedDiagnoses, 'codedAnswer'), undefined), function (answer) {
                    return answer.name.toLowerCase();
                });
                var codedAnswersCount = _.countBy(codedAnswers);
                diagnosis.invalid = !!(diagnosis.codedAnswer.name && codedAnswersCount[diagnosis.codedAnswer.name.toLowerCase()] > 1);
                return diagnosis.invalid;
            };

            var contextChange = function () {
                var invalidnewlyAddedDiagnoses = $scope.consultation.newlyAddedDiagnoses.filter(function (diagnosis) {
                    return isInvalidDiagnosis(diagnosis) || !$scope.isValid(diagnosis);
                });
                var invalidSavedDiagnosesFromCurrentEncounter = $scope.consultation.savedDiagnosesFromCurrentEncounter.filter(function (diagnosis) {
                    return !$scope.isValid(diagnosis);
                });
                var invalidPastDiagnoses = $scope.consultation.pastDiagnoses.filter(function (diagnosis) {
                    return !$scope.isValid(diagnosis);
                });
                var isValidAllergyForm = ($scope.consultation.allergy.isEmpty() || $scope.consultation.allergy.isValid());
                var isValidConditionForm = ($scope.consultation.condition.isEmpty() || $scope.consultation.condition.isValid());
                return {
                    allow: invalidnewlyAddedDiagnoses.length === 0 && invalidPastDiagnoses.length === 0
                    && invalidSavedDiagnosesFromCurrentEncounter.length === 0 && isValidConditionForm && isValidAllergyForm,
                    errorMessage: $scope.errorMessage
                };
            };
            contextChangeHandler.add(contextChange);

            var mapConcept = function (result) {
                return _.map(result.data, function (concept) {
                    var response = {
                        value: concept.matchedName || concept.conceptName,
                        concept: {
                            name: concept.conceptName,
                            uuid: concept.conceptUuid
                        },
                        lookup: {
                            name: concept.matchedName || concept.conceptName,
                            uuid: concept.conceptUuid
                        }
                    };

                    if (concept.matchedName && concept.matchedName !== concept.conceptName) {
                        response.value = response.value + " => " + concept.conceptName;
                    }
                    if (concept.code) {
                        response.value = response.value + " (" + concept.code + ")";
                    }
                    return response;
                });
            };

            $scope.getAddConditionMethod = function () {
                return function (item) {
                    $scope.consultation.condition.concept.uuid = item.lookup.uuid;
                    item.value = $scope.consultation.condition.concept.name = item.lookup.name;
                    angular.element("#condition").removeClass('illegalValue');
                };
            };

            $scope.getAddAllergyMethod = function () {
                return function (item) {
                    $scope.consultation.allergy.concept.uuid = item.lookup.uuid;
                    item.value = $scope.consultation.allergy.concept.name = item.lookup.name;
                    angular.element("#allergy").removeClass('illegalValue');
                };
            };

            var findExistingCondition = function (newCondition) {
                return _.find($scope.consultation.conditions, function (condition) {
                    if (newCondition.conditionNonCoded) {
                        return condition.conditionNonCoded == newCondition.conditionNonCoded;
                    }
                    return condition.concept.uuid == newCondition.concept.uuid;
                });
            };

            var findExistingAllergy = function (newAllergy) {
                return _.find($scope.consultation.allergies, function (allergy) {
                    if (newAllergy.allergyNonCoded) {
                        return allergy.allergyNonCoded == newAllergy.allergyNonCoded;
                    }
                    return allergy.concept.uuid == newAllergy.concept.uuid;
                });
            };

            $scope.filterConditions = function (status) {
                return _.filter($scope.consultation.conditions, {status: status});
            };

            $scope.filterAllergies = function (status) {
                return _.filter($scope.consultation.allergies, {status: status});
            };

            var expandInactiveOnNewInactive = function (condition) {
                if (condition.status == 'INACTIVE') {
                    $scope.toggles.expandInactive = true;
                }
            };
            var expandAllergyInactiveOnNewInactive = function (allergy) {
                if (allergy.status == 'INACTIVE') {
                    $scope.toggles.expandInactive = true;
                }
            };

            var updateOrAddCondition = function (condition) {
                var existingCondition = findExistingCondition(condition);
                if (!existingCondition) {
                    $scope.consultation.conditions.push(condition);
                    expandInactiveOnNewInactive(condition);
                    clearCondition();
                    return;
                }
                if (!existingCondition.uuid) {
                    _.pull($scope.consultation.conditions, existingCondition);
                    $scope.consultation.conditions.push(condition);
                    expandInactiveOnNewInactive(condition);
                    clearCondition();
                    return;
                }
                if (existingCondition.isActive()) {
                    messagingService.showMessage('error', 'CONDITION_LIST_ALREADY_EXISTS_AS_ACTIVE');
                    return;
                }
                if (existingCondition.activeSince && condition.onSetDate) {
                    if (!DateUtil.isBeforeDate(existingCondition.activeSince - 1, condition.onSetDate)) {
                        messagingService.showMessage('error', $translate.instant('CONDITION_LIST_ALREADY_EXISTS', {
                            lastActive: DateUtil.formatDateWithoutTime(existingCondition.activeSince),
                            status: existingCondition.status
                        }));
                        return;
                    }
                }
                if (existingCondition.status != condition.status) {
                    existingCondition.onSetDate = condition.onSetDate || DateUtil.today();
                    existingCondition.status = condition.status;
                }
                existingCondition.additionalDetail = condition.additionalDetail;
                if (existingCondition.isActive()) {
                    existingCondition.activeSince = existingCondition.endDate;
                }
                expandInactiveOnNewInactive(condition);
                clearCondition();
            };

            var updateOrAddAllergy = function (allergy) {
                var existingAllergy = findExistingAllergy(allergy);
                if (!existingAllergy) {
                    $scope.consultation.allergies.push(allergy);
                    expandAllergyInactiveOnNewInactive(allergy);
                    clearAllergy();
                    return;
                }
                if (!existingAllergy.uuid) {
                    _.pull($scope.consultation.allergies, existingAllergy);
                    $scope.consultation.allergies.push(allergy);
                    expandAllergyInactiveOnNewInactive(allergy);
                    clearAllergy();
                    return;
                }
                if (existingAllergy.isActive()) {
                    messagingService.showMessage('error', 'ALLERGIES_LIST_ALREADY_EXISTS_AS_ACTIVE');
                    return;
                }
                if (existingAllergy.activeSince && allergy.onSetDate) {
                    if (!DateUtil.isBeforeDate(existingAllergy.activeSince - 1, allergy.onSetDate)) {
                        messagingService.showMessage('error', $translate.instant('ALLERGIES_LIST_ALREADY_EXISTS', {
                            lastActive: DateUtil.formatDateWithoutTime(existingAllergy.activeSince),
                            status: existingAllergy.status
                        }));
                        return;
                    }
                }
                if (existingAllergy.status != allergy.status) {
                    existingAllergy.onSetDate = allergy.onSetDate || DateUtil.today();
                    existingAllergy.status = allergy.status;
                }
                existingAllergy.additionalDetail = allergy.additionalDetail;
                if (existingAllergy.isActive()) {
                    existingAllergy.activeSince = existingAllergy.endDate;
                }
                expandAllergyInactiveOnNewInactive(allergy);
                addAllergy();
            };
            $scope.addCondition = function (condition_) {
                var condition = _.cloneDeep(condition_);
                if (condition_.isNonCoded) {
                    condition.conditionNonCoded = condition.concept.name;
                    condition.concept = {};
                }
                condition.voided = false;
                calculateStage(condition);
                updateOrAddCondition(new Bahmni.Common.Domain.Condition(condition));
            };

            $scope.addAllergy = function (allergy_) {
                var allergy = _.cloneDeep(allergy_);
                if (allergy_.isNonCoded) {
                    allergy.allergyNonCoded = allergy.concept.name;
                    allergy.concept = {};
                }
                allergy.voided = false;
                updateOrAddAllergy(new Bahmni.Common.Domain.Allergy(allergy));
            };

            $scope.markAs = function (condition, status) {
                condition.status = status;
                condition.onSetDate = DateUtil.today();
                expandInactiveOnNewInactive(condition);
            };
            $scope.allergymarkAs = function (allergy, status) {
                allergy.status = status;
                allergy.onSetDate = DateUtil.today();
                expandInactiveOnNewInactive(allergy);
            };
            var clearCondition = function () {
                $scope.consultation.condition = new Bahmni.Common.Domain.Condition();
                $scope.consultation.condition.showNotes = false;
            };
            var clearAllergy = function () {
                $scope.consultation.allergy = new Bahmni.Common.Domain.Allergy();
                $scope.consultation.allergy.showNotes = false;
            };
            var calculateStage = function (condition) {
                _.map($scope.consultation.stages.answers, function (answer) {
                    _.map(answer.setMembers, function (member) {
                        if (condition.concept.uuid === member.uuid) {
                            if (!$scope.consultation.whoStage.value || !$scope.consultation.whoStage.value.name) {
                                $scope.consultation.whoStage.value = mapAnswer(answer);
                            } else if (answer.name.name > $scope.consultation.whoStage.value.name) {
                                $scope.consultation.whoStage.value = mapAnswer(answer);
                            }
                        }
                    });
                });
            };

            var mapWhoStageObs = function (response) {
                $scope.consultation.whoStage.concept = response.concept;
                $scope.consultation.whoStage.concept.name = Bahmni.Common.Constants.whoStageConceptName;
                $scope.consultation.whoStage.value = {
                    name: response.value.name,
                    uuid: response.value.uuid
                };
            };
            var mapAnswer = function (answer) {
                return {
                    name: answer.name.name,
                    uuid: answer.uuid
                };
            };
            $scope.addDiagnosisToConditions = function (diagnosis) {
                updateOrAddCondition(Bahmni.Common.Domain.Condition.createFromDiagnosis(diagnosis));
            };
            $scope.cannotBeACondition = function (diagnosis) {
                return diagnosis.certainty != 'CONFIRMED' || alreadyHasActiveCondition(diagnosis);
            };
            $scope.addDiagnosisToAllergies = function (diagnosis) {
                updateOrAddAllergy(Bahmni.Common.Domain.Allergy.createFromDiagnosis(diagnosis));
            };
            $scope.cannotBeAAllergy = function (diagnosis) {
                return diagnosis.certainty != 'CONFIRMED' || alreadyHasActiveAllergy(diagnosis);
            };

            $scope.addConditionAsFollowUp = function (condition) {
                condition.isFollowUp = true;
                var followUpCondition = {
                    concept: {
                        uuid: $scope.followUpConditionConcept.uuid
                    },
                    value: condition.uuid,
                    voided: false
                };
                $scope.consultation.followUpConditions.push(followUpCondition);
            };

            $scope.addAllergyAsFollowUp = function (allergy) {
                allergy.isFollowUp = true;
                var followUpAllergy = {
                    concept: {
                        uuid: $scope.followUpAllergyConcept.uuid
                    },
                    value: allergy.uuid,
                    voided: false
                };
                $scope.consultation.followUpAllergies.push(followUpAllergy);
            };

            var alreadyHasActiveCondition = function (diagnosis) {
                var existingCondition = findExistingCondition(Bahmni.Common.Domain.Condition.createFromDiagnosis(diagnosis));
                return existingCondition && existingCondition.isActive();
            };

            var alreadyHasActiveAllergy = function (diagnosis) {
                var existingAllergy = findExistingAllergy(Bahmni.Common.Domain.Allergy.createFromDiagnosis(diagnosis));
                return existingAllergy && existingAllergy.isActive();
            };

            $scope.cleanOutDiagnosisList = function (allDiagnoses) {
                angular.element("#name-0").addClass('illegalValue');

                if (allDiagnoses.length === 1) {
                    var codedAnswers = _.map(_.remove(_.map($scope.consultation.newlyAddedDiagnoses, 'codedAnswer'), undefined), function (answer) {
                        return answer.name.toLowerCase();
                    });
                    if (codedAnswers[0].toUpperCase() === allDiagnoses[0].value.toUpperCase()) {
                        angular.element("#name-0").removeClass('illegalValue');
                    }
                }
                return allDiagnoses.filter(function (diagnosis) {
                    return !alreadyAddedToDiagnosis(diagnosis);
                });
            };

            var alreadyAddedToDiagnosis = function (diagnosis) {
                var isPresent = false;
                $scope.consultation.newlyAddedDiagnoses.forEach(function (d) {
                    if (d.codedAnswer.uuid === diagnosis.concept.uuid) {
                        isPresent = true;
                    }
                });
                return isPresent;
            };

            $scope.removeObservation = function (index) {
                if (index >= 0) {
                    $scope.consultation.newlyAddedDiagnoses.splice(index, 1);
                }
            };

            $scope.clearDiagnosis = function (index) {
                var diagnosisBeingEdited = $scope.consultation.newlyAddedDiagnoses[index];
                diagnosisBeingEdited.clearCodedAnswerUuid();
            };

            var reloadDiagnosesSection = function (encounterUuid) {
                return diagnosisService.getPastAndCurrentDiagnoses($scope.patient.uuid, encounterUuid).then(function (response) {
                    $scope.consultation.pastDiagnoses = response.pastDiagnoses;
                    $scope.consultation.savedDiagnosesFromCurrentEncounter = response.savedDiagnosesFromCurrentEncounter;
                });
            };

            $scope.deleteDiagnosis = function (diagnosis) {
                var obsUUid = diagnosis.existingObs !== null ? diagnosis.existingObs : diagnosis.previousObs;

                spinner.forPromise(
                    diagnosisService.deleteDiagnosis(obsUUid).then(function () {
                        messagingService.showMessage('info', 'Deleted');
                        var currentUuid = $scope.consultation.savedDiagnosesFromCurrentEncounter.length > 0 ?
                                          $scope.consultation.savedDiagnosesFromCurrentEncounter[0].encounterUuid : "";
                        return reloadDiagnosesSection(currentUuid);
                    }))
                    .then(function () {
                    });
            };
            var clearBlankDiagnosis = true;
            var removeBlankDiagnosis = function () {
                if (clearBlankDiagnosis) {
                    $scope.consultation.newlyAddedDiagnoses = $scope.consultation.newlyAddedDiagnoses
                        .filter(function (diagnosis) {
                            return !diagnosis.isEmpty();
                        });
                    clearBlankDiagnosis = false;
                }
            };

            $scope.consultation.preSaveHandler.register("diagnosisSaveHandlerKey", removeBlankDiagnosis);
            $scope.$on('$destroy', removeBlankDiagnosis);

            $scope.processDiagnoses = function (data) {
                data.map(
                    function (concept) {
                        if (concept.conceptName === concept.matchedName) {
                            return {
                                'value': concept.matchedName,
                                'concept': concept
                            };
                        }
                        return {
                            'value': concept.matchedName + "=>" + concept.conceptName,
                            'concept': concept
                        };
                    }
                );
            };
            $scope.restEmptyRowsToOne = function (index) {
                var iter;
                for (iter = 0; iter < $scope.consultation.newlyAddedDiagnoses.length; iter++) {
                    if ($scope.consultation.newlyAddedDiagnoses[iter].isEmpty() && iter !== index) {
                        $scope.consultation.newlyAddedDiagnoses.splice(iter, 1);
                    }
                }
                var emptyRows = $scope.consultation.newlyAddedDiagnoses.filter(function (diagnosis) {
                    return diagnosis.isEmpty();
                });
                if (emptyRows.length === 0) {
                    addPlaceHolderDiagnosis();
                }
                clearBlankDiagnosis = true;
            };

            $scope.toggle = function (item) {
                item.show = !item.show;
            };

            $scope.isValid = function (diagnosis) {
                return diagnosis.isValidAnswer() && diagnosis.isValidOrder() && diagnosis.isValidCertainty();
            };

            $scope.isRetrospectiveMode = retrospectiveEntryService.isRetrospectiveMode;
            init();
        }
    ]);
