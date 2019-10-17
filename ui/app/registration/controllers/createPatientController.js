'use strict';

angular.module('bahmni.registration')
    .controller('CreatePatientController', ['$scope', '$rootScope', '$state', 'patientService', 'patient', 'spinner', 'appService', 'messagingService', 'ngDialog', '$q', '$http',
        function ($scope, $rootScope, $state, patientService, patient, spinner, appService, messagingService, ngDialog, $q, $http) {
            var dateUtil = Bahmni.Common.Util.DateUtil;
            $scope.actions = {};
            var errorMessage;
            var configValueForEnterId = appService.getAppDescriptor().getConfigValue('showEnterID');
            $scope.addressHierarchyConfigs = appService.getAppDescriptor().getConfigValue("addressHierarchy");
            $scope.disablePhotoCapture = appService.getAppDescriptor().getConfigValue("disablePhotoCapture");
            $scope.showEnterID = configValueForEnterId === null ? true : configValueForEnterId;
            $scope.today = Bahmni.Common.Util.DateTimeFormatter.getDateWithoutTime(dateUtil.now());
            $scope.isSectorSelectShown = false;
            $scope.isATIPSelectShown = false;
            $scope.isHealthFacilityShown = false;
            $scope.NID = {};
            $scope.currentYear = new Date().getFullYear();
            $rootScope.patientStatus = 'Pre TARV';
            $rootScope.regexDigits = '\\d+';
            $rootScope.regexCharacters = '^[a-záàãâéèêẽíìóòõôúùçA-ZÁÀÃÂÉÈÊẼÍÌÓÒÔÕÚÙÇ ]+$';
            $scope.myForms = {};
            $rootScope.isEligibleForVisit = true;
            $rootScope.typeOfRegistrationSelected = undefined;
            var getPersonAttributeTypes = function () {
                return $rootScope.patientConfiguration.attributeTypes;
            };

            $scope.onBirthDateChange = function () {
                $scope.dateValue = angular.element("#birthdate")[0].value;
                if ($scope.dateValue <= $scope.today) {
                    angular.element("#birthdate").css("border", "1px solid #DDD");
                    angular.element("#birthdate").css("background", "#fff");
                    angular.element("#birthdate").css("outline", "0");
                } else {
                    angular.element("#birthdate").css("border", "1px solid red");
                    angular.element("#birthdate").css("background", "#ffcdcd");
                    angular.element("#birthdate").css("outline", "0");
                    messagingService.showMessage('error', "US_REG_DATE_MESSAGE");
                }
            };

            $scope.buildFinalNID = function () {
                $scope.patient.primaryIdentifier.registrationNumber = $scope.NID.healthFacilityCode + '/' + $scope.NID.serviceCode + '/' + $scope.NID.year + '/' + $scope.NID.sequentialCode;
            };
            $scope.$watch('patient.primaryIdentifier.registrationNumber', function () {
                $scope.patient.primaryIdentifier.generate();
            });

            var prepopulateDefaultsInFields = function () {
                var personAttributeTypes = getPersonAttributeTypes();
                var patientInformation = appService.getAppDescriptor().getConfigValue("patientInformation");
                if (!patientInformation || !patientInformation.defaults) {
                    return;
                }
                var defaults = patientInformation.defaults;
                if ($scope.patient.US_REG_DATE == undefined) {
                    $scope.patient.US_REG_DATE = dateUtil.today();
                }
                var defaultVariableNames = _.keys(defaults);

                var hasDefaultAnswer = function (personAttributeType) {
                    return _.includes(defaultVariableNames, personAttributeType.name);
                };

                var isConcept = function (personAttributeType) {
                    return personAttributeType.format === "org.openmrs.Concept";
                };

                var setDefaultAnswer = function (personAttributeType) {
                    $scope.patient[personAttributeType.name] = defaults[personAttributeType.name];
                };

                var setDefaultConcept = function (personAttributeType) {
                    var defaultAnswer = defaults[personAttributeType.name];
                    var isDefaultAnswer = function (answer) {
                        return answer.fullySpecifiedName === defaultAnswer;
                    };

                    _.chain(personAttributeType.answers).filter(isDefaultAnswer).each(function (answer) {
                        $scope.patient[personAttributeType.name] = {
                            conceptUuid: answer.conceptId,
                            value: answer.fullySpecifiedName
                        };
                    }).value();
                };

                _.chain(personAttributeTypes)
                    .filter(hasDefaultAnswer)
                    .each(setDefaultAnswer).filter(isConcept).each(setDefaultConcept).value();
            };

            var expandSectionsWithDefaultValue = function () {
                angular.forEach($rootScope.patientConfiguration && $rootScope.patientConfiguration.getPatientAttributesSections(), function (section) {
                    var notNullAttribute = _.find(section && section.attributes, function (attribute) {
                        return $scope.patient[attribute.name] !== undefined;
                    });
                    section.expand = section.expanded || (notNullAttribute ? true : false);
                });
            };

            var init = function () {
                $scope.patient = patient.create();
                prepopulateDefaultsInFields();
                expandSectionsWithDefaultValue();
                $scope.patientLoaded = true;
            };

            init();

            var prepopulateFields = function () {
                var fieldsToPopulate = appService.getAppDescriptor().getConfigValue("prepopulateFields");
                if (fieldsToPopulate) {
                    _.each(fieldsToPopulate, function (field) {
                        var addressLevel = _.find($scope.addressLevels, function (level) {
                            return level.name === field;
                        });
                        if (addressLevel) {
                            $scope.patient.address[addressLevel.addressField] = $rootScope.loggedInLocation[addressLevel.addressField];
                        }
                    });
                }
            };
            prepopulateFields();

            var addNewRelationships = function () {
                var newRelationships = _.filter($scope.patient.newlyAddedRelationships, function (relationship) {
                    return relationship.relationshipType && relationship.relationshipType.uuid;
                });
                newRelationships = _.each(newRelationships, function (relationship) {
                    delete relationship.patientIdentifier;
                    delete relationship.content;
                    delete relationship.providerName;
                });
                $scope.patient.relationships = newRelationships;
            };

            var copyPatientProfileDataToScope = function (response) {
                var patientProfileData = response.data;
                $scope.patient.uuid = patientProfileData.patient.uuid;
                $scope.patient.name = patientProfileData.patient.person.names[0].display;
                $scope.patient.isNew = true;
                $scope.patient.registrationDate = dateUtil.now();
                $scope.patient.newlyAddedRelationships = [{}];
                $scope.actions.followUpAction(patientProfileData);
            };

            var createPatient = function (jumpAccepted) {
                return patientService.create($scope.patient, jumpAccepted).then(function (response) {
                    var patientStatus = _.filter(response.data.patient.person.attributes, function (currentObj) {
                        if (currentObj.attributeType.display == 'PATIENT_STATUS') {
                            return currentObj.value.display;
                        }
                    });
                    var creatorUuid = response.data.patient.auditInfo.creator.uuid;
                    var patientUuid = response.data.patient.person.uuid;
                    patientService.savePatientStatusState(patientStatus[0].value.display, patientUuid, creatorUuid, 'ACTIVE');
                    copyPatientProfileDataToScope(response);
                }, function (response) {
                    if (response.status === 412) {
                        var data = _.map(response.data, function (data) {
                            return {
                                sizeOfTheJump: data.sizeOfJump,
                                identifierName: _.find($rootScope.patientConfiguration.identifierTypes, { uuid: data.identifierType }).name
                            };
                        });
                        createPatient(true);
                    }
                    if (response.isIdentifierDuplicate) {
                        errorMessage = response.message;
                    }
                });
            };

            var createPromise = function () {
                var deferred = $q.defer();
                createPatient().finally(function () {
                    return deferred.resolve({});
                });
                return deferred.promise;
            };
            var validFields = function () {
                if ($scope.myForms.myForm.healthFacilityCode.$invalid || $scope.myForms.myForm.nidYear.$invalid || $scope.myForms.myForm.sequentialCode.$invalid || $scope.myForms.myForm.givenName.$invalid
                    || $scope.myForms.myForm.familyName.$invalid || $scope.myForms.myForm.gender.$invalid || $scope.myForms.myForm.ageYear.$invalid
                    || $scope.myForms.myForm.birthdate.$invalid) {
                    return false;
                }
                return true;
            };

            $scope.create = function () {
                if (!validFields() || !$rootScope.isValidFields) {
                    messagingService.showMessage("error", "REGISTRATION_REQUIRED_INVALID_FIELD");
                }
                else {
                    addNewRelationships();
                    var errorMessages = Bahmni.Common.Util.ValidationUtil.validate($scope.patient, $scope.patientConfiguration.attributeTypes);
                    if (errorMessages.length > 0) {
                        errorMessages.forEach(function (errorMessage) {
                            messagingService.showMessage('error', errorMessage);
                        });
                        return $q.when({});
                    }
                    return spinner.forPromise(createPromise()).then(function (response) {
                        if (errorMessage) {
                            messagingService.showMessage("error", errorMessage);
                            errorMessage = undefined;
                        }
                    });
                }
            };

            $scope.afterSave = function () {
                messagingService.showMessage("info", "REGISTRATION_LABEL_SAVED");
                $state.go("patient.edit", {
                    patientUuid: $scope.patient.uuid
                });
            };

            $scope.handleSectorChange = function () {
                if ($scope.patient['SECTOR_SELECT'].value == 'ATIP') {
                    $scope.isATIPSelectShown = true;
                }
                else {
                    $scope.isATIPSelectShown = false;
                    $scope.patient['ATIP_SELECT'] = null;
                }
            };
        }
    ]);
