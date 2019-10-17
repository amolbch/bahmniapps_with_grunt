'use strict';

angular.module('bahmni.registration')
    .controller('PatientCommonController', ['$scope', '$rootScope', '$http', 'patientAttributeService', 'appService', 'spinner', '$location', 'ngDialog', '$window', '$state', 'patientService', 'providerService', 'providerTypeService',
        function ($scope, $rootScope, $http, patientAttributeService, appService, spinner, $location, ngDialog, $window, $state, patientService, providerService, providerTypeService) {
            var autoCompleteFields = appService.getAppDescriptor().getConfigValue("autoCompleteFields", []);
            var showCasteSameAsLastNameCheckbox = appService.getAppDescriptor().getConfigValue("showCasteSameAsLastNameCheckbox");
            var personAttributes = [];
            var caste;
            $scope.patientDocuments = [];
            $scope.showMiddleName = appService.getAppDescriptor().getConfigValue("showMiddleName");
            $scope.showLastName = appService.getAppDescriptor().getConfigValue("showLastName");
            $scope.isLastNameMandatory = $scope.showLastName && appService.getAppDescriptor().getConfigValue("isLastNameMandatory");
            $scope.showBirthTime = appService.getAppDescriptor().getConfigValue("showBirthTime") != null
                ? appService.getAppDescriptor().getConfigValue("showBirthTime") : true;  // show birth time by default
            $scope.genderCodes = Object.keys($rootScope.genderMap);
            $scope.dobMandatory = appService.getAppDescriptor().getConfigValue("dobMandatory") || false;
            $scope.readOnlyExtraIdentifiers = appService.getAppDescriptor().getConfigValue("readOnlyExtraIdentifiers");
            $scope.showSaveConfirmDialogConfig = appService.getAppDescriptor().getConfigValue("showSaveConfirmDialog");
            $scope.showSaveAndContinueButton = false;
            var dontSaveButtonClicked = false;
            var isHref = false;
            var currentProvider = $rootScope.currentProvider;
            $rootScope.duplicatePatients;
            $rootScope.duplicatePatientCount = 0;
            $scope.isAddressRequired = "false";
            $scope.showTransferredOutSection = false;
            $scope.showSuspensionSection = false;
            $scope.showDeathSection = false;
            $scope.formFieldsDisabled = false;
            $scope.hasClinical = "false";
            $scope.hasClinicalProfile = false;

            $scope.getProfile = function () {
                return providerTypeService.getAllProviders().then(function (results) {
                    var currentProvider = $rootScope.currentProvider;
                    providerService.getProviderAttributes(currentProvider.uuid).then(function (response) {
                        if (response.data) {
                            var providerAttributes = response.data.results;
                        }

                        var providerType = providerTypeService.getProviderType(providerAttributes)[0];

                        if (providerType === 'Clinical') {
                            $scope.hasClinicalProfile = true;
                        }
                    });
                });
            };

            spinner.forPromise($scope.getProfile());
            var findPrivilege = function (privilegeName) {
                return _.find($rootScope.currentUser.privileges, function (privilege) {
                    $scope.hasCLinical = privilegeName === privilege.name;
                    return privilegeName === privilege.name;
                });
            };

            findPrivilege("app:clinical");

            $scope.$on('DisableRegistrationFields', function (ent, data) {
                if (data) {
                    $scope.formFieldsDisabled = data;
                } else {
                    $scope.formFieldsDisabled = false;
                }
            });

            $scope.$on("DisableFields", function (evt, data) {
                $scope.formFieldsDisabled = data;
            });

            $scope.$on("IN_TF", function (evt, data) {
                $scope.showTransferredOutSection = data;
            });

            $scope.$on("IN_SU", function (evt, data) {
                $scope.showSuspensionSection = data;
            });

            $scope.$on("IN_DT", function (evt, data) {
                $scope.showDeathSection = data;
            });

            $rootScope.personSearchResultsConfig = ["NICK_NAME", "PRIMARY_CONTACT_NUMBER_1", "PATIENT_STATUS", "US_REG_DATE"];
            $rootScope.searchActions = appService.getAppDescriptor().getExtensions("org.bahmni.registration.patient.search.result.action");
            $scope.checkDuplicatePatients = function () {
                var patientGivenName = $scope.patient.givenName || '';
                var patientLastName = $scope.patient.familyName || '';
                var gender = $scope.patient.gender || '';
                var birthDate = $scope.patient.birthdate || '';

                if (birthDate != '') {
                    birthDate = new Date(birthDate);
                }
                var queryParams = patientGivenName + ' ' + patientLastName;
                if (queryParams.length > 1) {
                    patientService.searchDuplicatePatients(queryParams, gender, birthDate).then(function (response) {
                        $rootScope.duplicatePatients = response.pageOfResults;
                        _.map($rootScope.duplicatePatients, function (result) {
                            result.customAttribute = result.customAttribute && JSON.parse(result.customAttribute);
                        });
                        $rootScope.duplicatePatientCount = $rootScope.duplicatePatients.length;
                    });
                } else {
                    $rootScope.duplicatePatientCount = 0;
                }
            };

            $rootScope.forPatient = function (patient) {
                $scope.selectedPatient = patient;
                return $scope;
            };

            $rootScope.doExtensionAction = function (extension) {
                var forwardTo = appService.getAppDescriptor().formatUrl(extension.url, {'patientUuid': $scope.selectedPatient.uuid});
                $location.url(forwardTo);
            };

            $scope.updateBirthDateEstimated = function () {
                if ($scope.patient.birthdate) {
                    $scope.isBirthDateEstimatedDisabled = true;
                    $scope.isAgeDisabled = true;
                }
                else {
                    $scope.isBirthDateEstimatedDisabled = false;
                    $scope.isAgeDisabled = false;
                }
            };

            $scope.updateDOB = function () {
                if ($scope.patient.birthdateEstimated) {
                    $scope.isDOBDisabled = true;
                }
                else {
                    $scope.isDOBDisabled = false;
                }
            };

            $scope.$watch('patient.birthdateEstimated', function (newValue, oldValue) {
                if (newValue != oldValue) {
                    if (newValue == true) {
                        $scope.isDOBDisabled = true;
                    }
                    else {
                        $scope.isBirthDateEstimatedDisabled = false;
                    }
                }
            });

            $rootScope.onHomeNavigate = function (event) {
                if ($scope.showSaveConfirmDialogConfig && $state.current.name != "patient.visit") {
                    event.preventDefault();
                    $scope.targetUrl = event.currentTarget.getAttribute('href');
                    isHref = true;
                    $scope.confirmationPrompt(event);
                }
            };

            var stateChangeListener = $rootScope.$on("$stateChangeStart", function (event, toState, toParams) {
                if ($scope.showSaveConfirmDialogConfig && (toState.url == "/search" || toState.url == "/patient/new")) {
                    $scope.targetUrl = toState.name;
                    isHref = false;
                    $scope.confirmationPrompt(event, toState, toParams);
                }
            });

            $scope.confirmationPrompt = function (event, toState) {
                if (dontSaveButtonClicked === false) {
                    if (event) {
                        event.preventDefault();
                    }
                    ngDialog.openConfirm({template: "../common/ui-helper/views/saveConfirmation.html", scope: $scope});
                }
            };

            $scope.continueWithoutSaving = function () {
                ngDialog.close();
                dontSaveButtonClicked = true;
                if (isHref === true) {
                    $window.open($scope.targetUrl, '_self');
                } else {
                    $state.go($scope.targetUrl);
                }
            };

            $scope.cancelTransition = function () {
                ngDialog.close();
                delete $scope.targetUrl;
            };

            $scope.$on("$destroy", function () {
                stateChangeListener();
            });

            $scope.getDeathConcepts = function () {
                return $http({
                    url: Bahmni.Common.Constants.globalPropertyUrl,
                    method: 'GET',
                    params: {
                        property: 'concept.reasonForDeath'
                    },
                    withCredentials: true,
                    transformResponse: [function (deathConcept) {
                        if (_.isEmpty(deathConcept)) {
                            $scope.deathConceptExists = false;
                        } else {
                            $http.get(Bahmni.Common.Constants.conceptSearchByFullNameUrl, {
                                params: {
                                    name: deathConcept,
                                    v: "custom:(uuid,name,set,setMembers:(uuid,display,name:(uuid,name),retired))"
                                },
                                withCredentials: true
                            }).then(function (results) {
                                $scope.deathConceptExists = !!results.data.results.length;
                                $scope.deathConcepts = results.data.results[0] ? results.data.results[0].setMembers : [];
                                $scope.deathConcepts = filterRetireDeathConcepts($scope.deathConcepts);
                            });
                        }
                    }]
                });
            };
            spinner.forPromise($scope.getDeathConcepts());
            var filterRetireDeathConcepts = function (deathConcepts) {
                return _.filter(deathConcepts, function (concept) {
                    return !concept.retired;
                });
            };

            $scope.isAutoComplete = function (fieldName) {
                return !_.isEmpty(autoCompleteFields) ? autoCompleteFields.indexOf(fieldName) > -1 : false;
            };

            $scope.showCasteSameAsLastName = function () {
                personAttributes = _.map($rootScope.patientConfiguration.attributeTypes, function (attribute) {
                    return attribute.name.toLowerCase();
                });
                var personAttributeHasCaste = personAttributes.indexOf("caste") !== -1;
                caste = personAttributeHasCaste ? $rootScope.patientConfiguration.attributeTypes[personAttributes.indexOf("caste")].name : undefined;
                return showCasteSameAsLastNameCheckbox && personAttributeHasCaste;
            };

            $scope.setCasteAsLastName = function () {
                if ($scope.patient.sameAsLastName) {
                    $scope.patient[caste] = $scope.patient.familyName;
                }
            };

            var showSections = function (sectionsToShow, allSections) {
                _.each(sectionsToShow, function (sectionName) {
                    allSections[sectionName].canShow = true;
                    allSections[sectionName].expand = true;
                });
            };

            var hideSections = function (sectionsToHide, allSections) {
                _.each(sectionsToHide, function (sectionName) {
                    allSections[sectionName].canShow = false;
                });
            };

            var executeRule = function (ruleFunction) {
                var attributesShowOrHideMap = ruleFunction($scope.patient);
                var patientAttributesSections = $rootScope.patientConfiguration.getPatientAttributesSections();
                showSections(attributesShowOrHideMap.show, patientAttributesSections);
                hideSections(attributesShowOrHideMap.hide, patientAttributesSections);
            };

            $scope.handleUpdate = function (attribute) {
                var ruleFunction = Bahmni.Registration.AttributesConditions.rules && Bahmni.Registration.AttributesConditions.rules[attribute];
                if (ruleFunction) {
                    executeRule(ruleFunction);
                }
            };

            $scope.updatePatientState = function (value) {
                if (value.value == 'Patient_Transferred_Out') {
                    $scope.$emit('PTO', 'INACTIVE_TRANSFERRED_OUT');
                    $scope.showTransferredOutSection = true;
                    $scope.patient['TRANSFERENCE_HF_NAME'] = '';
                    $scope.patient['TRANSFERENCE_HF_DISTRICT'] = '';
                    $scope.patient['TRANSFERENCE_HF_PROVINCE'] = '';
                    $scope.showDeathSection = false;
                    $scope.showSuspensionSection = false;
                } else if (value.value == 'Inactive_Death') {
                    $scope.showDeathSection = true;
                    $scope.$emit('PTO', 'INACTIVE_DEATH');
                    $scope.showTransferredOutSection = false;
                    $scope.showSuspensionSection = false;
                } else if (value.value == 'Patient_Suspension') {
                    $scope.showSuspensionSection = true;
                    $scope.$emit('PTO', 'INACTIVE_SUSPENDED');
                    $scope.showDeathSection = false;
                    $scope.showTransferredOutSection = false;
                } else {
                    $scope.showDeathSection = false;
                    $scope.showTransferredOutSection = false;
                    $scope.showSuspensionSection = false;
                }
            };

            $scope.updateLocationRequired = function (value) {
                $scope.$broadcast('HFEvent', value);
            };

            var executeShowOrHideRules = function () {
                _.each(Bahmni.Registration.AttributesConditions.rules, function (rule) {
                    executeRule(rule);
                });
            };

            $scope.$watch('patientLoaded', function () {
                if ($scope.patientLoaded) {
                    executeShowOrHideRules();
                }
            });

            $scope.getAutoCompleteList = function (attributeName, query, type) {
                return patientAttributeService.search(attributeName, query, type);
            };

            $scope.getDataResults = function (data) {
                return data.results;
            };

            $scope.$watch('patient.familyName', function () {
                if ($scope.patient.sameAsLastName) {
                    $scope.patient[caste] = $scope.patient.familyName;
                }
            });

            $scope.$watch('patient.caste', function () {
                if ($scope.patient.sameAsLastName && ($scope.patient.familyName !== $scope.patient[caste])) {
                    $scope.patient.sameAsLastName = false;
                }
            });

            $scope.selectIsDead = function () {
                if ($scope.patient.causeOfDeath || $scope.patient.deathDate) {
                    $scope.patient.dead = true;
                }
            };

            $scope.disableIsDead = function () {
                return ($scope.patient.causeOfDeath || $scope.patient.deathDate) && $scope.patient.dead;
            };

            $scope.nationality = function () {
                var mozAttributes = ['REGISTRATION_OPTION_NONE', 'BI', 'CARTAO_DE_ELEITOR', 'CEDULA_DE_NASCIMENTO', 'NUIT', 'NUIC'];
                var foreignAttributes = ['REGISTRATION_OPTION_NONE', 'DIRE', 'NUIT', 'PASSAPORTE_ESTRANGEIRO'];

                if ($scope.patient.NATIONALITY == undefined) {
                    $scope.patient.NATIONALITY = "";
                }
                else {
                    $scope.nationalityChoice = $scope.patient.NATIONALITY.value;
                    if ($scope.nationalityChoice == 'Moçambicana' || $scope.nationalityChoice == 'Mozambican') {
                        $scope.nationalityDocs = mozAttributes;
                        $scope.patientDocuments = [];
                    }
                    else if ($scope.nationalityChoice == 'Outra' || $scope.nationalityChoice == 'Other') {
                        $scope.nationalityDocs = foreignAttributes;
                        $scope.patientDocuments = [];
                    }
                }
            };

            $scope.$watch('patient.NATIONALITY.value', function (newValue, oldValue) {
                if (newValue != oldValue) {
                    if (oldValue == undefined) {
                        $scope.nationality();
                    }
                    else {
                        for (var i = 0; i <= $scope.nationalityDocs.length; i++) {
                            $scope.patient[$scope.nationalityDocs[i]] = "";
                        }
                        $scope.patientDocuments = [];
                        $scope.nationality();
                    }
                }
            });
            $scope.nationalityAttribute = function (docz) {
                $scope.nationalAttribute = docz;
                $scope.patient.attribute = $scope.nationalAttribute;
            };
            $scope.addDocumentRow = function (dcmt) {
                if ($scope.patientDocuments.includes(dcmt) || dcmt == undefined || !$scope.nationalityDocs.includes(dcmt)) {
                    alert("Selecione outro documento");
                }
                else {
                    $scope.patientDocuments.push(dcmt);
                    $scope.nationalityDocs.splice($scope.nationalityDocs.indexOf(dcmt), 1);
                }
            };
            $scope.removeDocumentRow = function (documnt) {
                if ($scope.patientDocuments.includes(documnt)) {
                    $scope.patientDocuments.splice($scope.patientDocuments.indexOf(documnt), 1);
                    $scope.nationalityDocs.push(documnt);
                    $scope.patient[documnt] = "";
                }
                else {
                    alert("Remova outro documento");
                }
            };
        }]);

