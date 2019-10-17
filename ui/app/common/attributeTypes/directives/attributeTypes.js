'use strict';

angular.module('bahmni.common.attributeTypes', []).directive('attributeTypes', ['messagingService', function (messagingService) {
    return {
        scope: {
            targetModel: '=',
            attribute: '=',
            fieldValidation: '=',
            isAutoComplete: '&',
            handleLocationChange: '&',
            handleSectorChange: '&',
            updateLocationRequired: '&',
            getAutoCompleteList: '&',
            getDataResults: '&',
            handleUpdate: '&',
            updatePatientState: '&',
            isReadOnly: '&',
            isForm: '=?'
        },
        templateUrl: '../common/attributeTypes/views/attributeInformation.html',
        restrict: 'E',
        controller: function ($scope, $timeout, $rootScope) {
            var dateUtil = Bahmni.Common.Util.DateUtil;
            $scope.getAutoCompleteList = $scope.getAutoCompleteList();
            $scope.getDataResults = $scope.getDataResults();
            $scope.today = dateUtil.getDateWithoutTime(dateUtil.now());
            // to avoid watchers in one way binding
            $scope.isAutoComplete = $scope.isAutoComplete() || function () { return false; };
            $scope.isReadOnly = $scope.isReadOnly() || function () { return false; };
            $scope.handleUpdate = $scope.handleUpdate() || function () { return false; };
            $scope.updatePatientState = $scope.updatePatientState() || function () { return false; };
            $scope.handleLocationChange = $scope.handleLocationChange() || function () { return false; };
            $scope.handleSectorChange = $scope.handleSectorChange() || function () { return false; };
            $scope.updateLocationRequired = $scope.updateLocationRequired() || function () { return false; };
            $scope.suggestions = $scope.attribute.answers;

            $scope.showTag = false;
            $scope.borderColor = "1px solid #d1d1d1";
            $rootScope.canSave = true;
            $scope.regexNumbers = '[^0-9+ ]';
            $scope.regexCharacters = '[^a-záàãâéèêẽíìóòõôúùçA-ZÁÀÃÂÉÈÊẼÍÌÓÒÔÕÚÙÇ ]';

            if ($scope.attribute.name === "PATIENT_STATUS") {
                for (var i = 0; i < $scope.attribute.answers.length; i++) {
                    if ($scope.attribute.answers[i].fullySpecifiedName === "Pre TARV") {
                        $rootScope.patientPreTARVStatusUiid = $scope.attribute.answers[i].conceptId;
                    }
                }
            }

            $scope.onDateChange = function (attribute) {
                if (attribute.name === "US_REG_DATE") {
                    var selectedDate = dateUtil.getDateWithoutTime($scope.targetModel[attribute.name]);
                    if (selectedDate <= $scope.today) {
                        angular.element("#US_REG_DATE").css("border", "1px solid #DDD");
                        angular.element("#US_REG_DATE").css("background", "#fff");
                        angular.element("#US_REG_DATE").css("outline", "0");
                    } else {
                        angular.element("#US_REG_DATE").css("border", "1px solid red");
                        angular.element("#US_REG_DATE").css("background", "#ffcdcd");
                        angular.element("#US_REG_DATE").css("outline", "0");
                        messagingService.showMessage('error', "US_REG_DATE_MESSAGE");
                    }
                }
            };

            $scope.validationDirectiveTypeOfRegistration = function (attribute) {
                if (attribute.name === "TYPE_OF_REGISTRATION") {
                    if ($scope.targetModel.TYPE_OF_REGISTRATION.value != undefined) {
                        $rootScope.typeOfRegistrationSelected = $scope.targetModel.TYPE_OF_REGISTRATION.value;
                    }
                    else {
                        $rootScope.typeOfRegistrationSelected = $scope.targetModel.TYPE_OF_REGISTRATION.value;
                    }
                }
            };

            $scope.validationDirectivePatientStatus = function (attribute) {
                if (attribute.name === "PATIENT_STATUS") {
                    if ($scope.targetModel.PATIENT_STATUS.value != undefined) {
                        $rootScope.patientStatus = $scope.targetModel.PATIENT_STATUS.value;
                    }
                    else {
                        $rootScope.patientStatus = $scope.targetModel.PATIENT_STATUS.value;
                    }
                }
            };

            $scope.appendConceptNameToModel = function (attribute) {
                $timeout(function () {
                    if (attribute.name === "TYPE_OF_REGISTRATION") {
                        if ($scope.targetModel.TYPE_OF_REGISTRATION.value === "NEW_PATIENT") {
                            $scope.targetModel.PATIENT_STATUS.conceptUuid = $rootScope.patientPreTARVStatusUiid;
                        }
                    } }, 15);

                var attributeValueConceptType = $scope.targetModel[attribute.name];
                var concept = _.find(attribute.answers, function (answer) {
                    return answer.conceptId === attributeValueConceptType.conceptUuid;
                });
                attributeValueConceptType.value = concept && concept.fullySpecifiedName;
            };

            $scope.suggest = function (string) {
                $scope.borderColor = "1px solid #d1d1d1";
                $scope.backgroundColor = "#fff";
                $scope.hideList = false;
                $scope.showTag = true;
                var output = [];
                if (string && string.value && string.value.length >= 2) {
                    angular.forEach($scope.suggestions, function (suggestion) {
                        if (suggestion.description.toLowerCase().indexOf(string.value.toLowerCase()) >= 0) {
                            output.push(suggestion);
                        }
                    });
                    $scope.filterSuggestions = output;
                } else {
                    $scope.hideList = true;
                }
            };

            $scope.hideSuggestions = function (object) {
                $scope.targetModel[$scope.attribute.name] = object;
                $scope.targetModel[$scope.attribute.name].value = object.description;
                $scope.targetModel[$scope.attribute.name].conceptUuid = object.conceptId;
                $scope.hideList = true;
                $rootScope.canSave = true;
                $scope.borderColor = "1px solid #d1d1d1";
                $scope.backgroundColor = "#fff";
            };

            $scope.validateField = function (isMouse, fieldName) {
                if ($scope.targetModel[$scope.attribute.name] !== undefined && $scope.targetModel[$scope.attribute.name].value !== "" && $scope.targetModel[$scope.attribute.name] !== null) {
                    var alert = true;
                    $timeout(function () {
                        for (var i = 0; i < $scope.suggestions.length; i++) {
                            if ($scope.targetModel[$scope.attribute.name].value.toLowerCase() === $scope.suggestions[i].description.toLowerCase()) {
                                alert = false;
                            }
                        }
                        if (alert) {
                            if (fieldName == 'PATIENT_OCCUPATION') {
                                $scope.borderColor = "1px solid #ff5252";
                                $scope.backgroundColor = "#ffcdcd";
                                if (!isMouse) {
                                    messagingService.showMessage("error", "INVALID_OCCUPATION");
                                    $scope.hideList = true;
                                }
                                $rootScope.canSave = false;
                            }

                            if (fieldName == 'CAUSE_OF_DEATH') {
                                $scope.borderColor = "1px solid #ff5252";
                                $scope.backgroundColor = "#ffcdcd";
                                if (!isMouse) {
                                    messagingService.showMessage("error", "INVALID_DEATH_CAUSE_MESSAGE");
                                    $scope.hideList = true;
                                }
                                $rootScope.canSave = false;
                            }
                        }
                    }, 500);
                } else {
                    $rootScope.canSave = true;
                    if (!isMouse) { $scope.hideList = true; }
                    $scope.targetModel[$scope.attribute.name] = { value: "", conceptUuid: null };
                }
            };
        }
    };
}]);
