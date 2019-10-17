'use strict';

angular.module('bahmni.clinical').controller('ConsultationController',
    ['$scope', '$rootScope', '$state', '$location', '$translate', 'clinicalAppConfigService', 'diagnosisService', 'urlHelper', 'contextChangeHandler',
        'spinner', 'encounterService', 'messagingService', 'sessionService', 'retrospectiveEntryService', 'patientContext', '$q',
        'patientVisitHistoryService', '$stateParams', '$window', 'visitHistory', 'clinicalDashboardConfig', 'appService',

        'ngDialog', '$filter', 'configurations', 'visitConfig', 'conditionsService', 'configurationService', 'auditLogService', 'allergiesService', 'printer', 'printPrescriptionReportService', 'providerService', 'providerTypeService', '$http', 'patientService', 'transferOutService',
        function ($scope, $rootScope, $state, $location, $translate, clinicalAppConfigService, diagnosisService, urlHelper, contextChangeHandler,
            spinner, encounterService, messagingService, sessionService, retrospectiveEntryService, patientContext, $q,
            patientVisitHistoryService, $stateParams, $window, visitHistory, clinicalDashboardConfig, appService,
            ngDialog, $filter, configurations, visitConfig, conditionsService, configurationService, auditLogService, allergiesService, printer, printPrescriptionReportService, providerService, providerTypeService, $http, patientService, transferOutService) {
            var DateUtil = Bahmni.Common.Util.DateUtil;
            var getPreviousActiveCondition = Bahmni.Common.Domain.Conditions.getPreviousActiveCondition;
            var currentProviderType;
            $scope.togglePrintList = false;
            $rootScope.patient = patientContext.patient;
            $scope.showDashboardMenu = false;
            $scope.stateChange = function () {
                return $state.current.name === 'patient.dashboard.show';
            };
            $scope.showComment = true;
            $scope.showSaveAndContinueButton = true;

            $scope.visitHistory = visitHistory;
            $scope.consultationBoardLink = clinicalAppConfigService.getConsultationBoardLink();
            $scope.showControlPanel = false;
            $scope.clinicalDashboardConfig = clinicalDashboardConfig;
            $scope.lastvisited = null;

            $scope.openConsultationInNewTab = function () {
                $window.open('#' + $scope.consultationBoardLink, '_blank');
            };

            $scope.toggleDashboardMenu = function () {
                $scope.showDashboardMenu = !$scope.showDashboardMenu;
            };

            $scope.showDashboard = function (dashboard) {
                if (!clinicalDashboardConfig.isCurrentTab(dashboard)) {
                    $scope.$parent.$broadcast("event:switchDashboard", dashboard);
                }
                $scope.showDashboardMenu = false;
            };

            var setPrintAction = function (event, tab) {
                tab.print = function () {
                    $rootScope.$broadcast(event, tab);
                };
            };
            var setDashboardPrintAction = _.partial(setPrintAction, "event:printDashboard", _);
            var setVisitTabPrintAction = function (tab) {
                tab.print = function () {
                    var url = $state.href('patient.dashboard.visitPrint', {
                        visitUuid: visitHistory.activeVisit.uuid,
                        tab: tab.title,
                        print: 'print'
                    });
                    window.open(url, '_blank');
                };
            };

            _.each(visitConfig.tabs, setVisitTabPrintAction);
            _.each(clinicalDashboardConfig.tabs, setDashboardPrintAction);
            $scope.printList = _.concat(clinicalDashboardConfig.tabs, visitConfig.tabs);
            clinicalDashboardConfig.quickPrints = appService.getAppDescriptor().getConfigValue('quickPrints');
            var clinicalDashboardUuid = '0623e3b6-8701-4c07-8493-2930bd67f11a';
            var prescriptionReportUuid = '2c6c27b0-3eef-4010-bfbb-9133d0016d25';
            var transferReportUuid = '2c6c27b0-3eef-4010-bfbb-9133d0017d45';
            $scope.printButtonDropdownOptions = [{
                name: $translate.instant('PRINT_CLINICAL_DASHBOARD_LABEL'),
                uuid: clinicalDashboardUuid
            },
            {
                name: $translate.instant('PRESCRIPTION_REPORT_PRINT_PRESCRIPTION_LABEL'),
                uuid: prescriptionReportUuid
            }
            ];

            if ($scope.patient['PATIENT_STATE_CHANGE']) {
                if ($scope.patient['PATIENT_STATE_CHANGE'].value.display == 'Patient_Transferred_Out') {
                    $scope.printButtonDropdownOptions.push({
                        name: $translate.instant('TRANSFER_OUT_FORM'),
                        uuid: transferReportUuid
                    });
                }
            }

            $scope.optionText = function (value) {
                return value.name;
            };

            $scope.printDashboardOrPrescription = function (option)
            {
                if (option.uuid === clinicalDashboardUuid)
                {
                    clinicalDashboardConfig.currentTab.print();
                }
                else if (option.uuid === prescriptionReportUuid)
                {
                    $rootScope.isTarvReport = false;
                    printPrescriptionReportService.getReportModel($stateParams.patientUuid, $rootScope.isTarvReport)
                        .then(function (reportData)
                        {
                            $rootScope.prescriptionReportData = reportData;
                            printer.printFromScope("dashboard/views/printPrescriptionReport.html", $rootScope, function () { });
                        });
                }
                else
                {
                    if (option.uuid === transferReportUuid)
                    {
                        $rootScope.isTarvReport = false;
                    }
                    transferOutService.getReportModel($stateParams.patientUuid, $rootScope.isTarvReport)
                            .then(function (reportData)
                            {
                                $rootScope.transferReportData = reportData;
                                printer.printFromScope("dashboard/views/TransferOut.html", $rootScope, function () { });
                            });
                }
            };
            $scope.allowConsultation = function ()
            {
                return appService.getAppDescriptor().getConfigValue('allowConsultationWhenNoOpenVisit');
            };
            $scope.closeDashboard = function (dashboard)
            {
                clinicalDashboardConfig.closeTab(dashboard);
                $scope.$parent.$parent.$broadcast("event:switchDashboard", clinicalDashboardConfig.currentTab);
            };
            $scope.closeAllDialogs = function ()
            {
                ngDialog.closeAll();
            };
            $scope.availableBoards = [];
            $scope.configName = $stateParams.configName;

            $scope.getTitle = function (board) {
                return $filter('titleTranslate')(board);
            };

            $scope.showBoard = function (boardIndex) {
                $rootScope.collapseControlPanel();
                return buttonClickAction($scope.availableBoards[boardIndex]);
            };

            $scope.gotoPatientDashboard = function () {
                if (!isFormValid()) {
                    $scope.$parent.$parent.$broadcast("event:errorsOnForm");
                    return $q.when({});
                }
                if (contextChangeHandler.execute()["allow"]) {
                    var params = {
                        configName: $scope.configName,
                        patientUuid: patientContext.patient.uuid,
                        encounterUuid: undefined
                    };
                    if ($scope.dashboardDirty) {
                        params['dashboardCachebuster'] = Math.random();
                    }
                    $state.go("patient.dashboard.show", params);
                }
            };

            var isLongerName = function (value) {
                return value ? value.length > 18 : false;
            };

            $scope.getShorterName = function (value) {
                return isLongerName(value) ? value.substring(0, 15) + "..." : value;
            };

            $scope.isInEditEncounterMode = function () {
                return $stateParams.encounterUuid !== undefined && $stateParams.encounterUuid !== 'active';
            };

            $scope.enablePatientSearch = function () {
                return appService.getAppDescriptor().getConfigValue('allowPatientSwitchOnConsultation') === true;
            };

            var setCurrentBoardBasedOnPath = function () {
                var currentPath = $location.url();
                var board = _.find($scope.availableBoards, function (board) {
                    if (board.url === "treatment") {
                        return _.includes(currentPath, board.extensionParams ? board.extensionParams.tabConfigName : board.url);
                    }
                    return _.includes(currentPath, board.url);
                });
                if (board) {
                    $scope.currentBoard = board;
                    $scope.currentBoard.isSelectedTab = true;
                }
            };

            var initialize = function () {
                var appExtensions = clinicalAppConfigService.getAllConsultationBoards();
                $scope.adtNavigationConfig = {
                    forwardUrl: Bahmni.Clinical.Constants.adtForwardUrl,
                    title: $translate.instant("CLINICAL_GO_TO_DASHBOARD_LABEL"),
                    privilege: Bahmni.Clinical.Constants.adtPrivilege
                };
                $scope.availableBoards = $scope.availableBoards.concat(appExtensions);
                $scope.showSaveConfirmDialogConfig = appService.getAppDescriptor().getConfigValue('showSaveConfirmDialog');
                var adtNavigationConfig = appService.getAppDescriptor().getConfigValue('adtNavigationConfig');
                Object.assign($scope.adtNavigationConfig, adtNavigationConfig);
                setCurrentBoardBasedOnPath();
                var currentProvider = $rootScope.currentProvider;
                return $q.all([providerService.getProviderAttributes(currentProvider.uuid)]).then(function (response) {
                    if (response[0].data) {
                        var providerAttributes = response[0].data.results;
                        currentProviderType = providerTypeService.getProviderType(providerAttributes)[0];
                    }
                });
            };

            $scope.shouldDisplaySaveConfirmDialogForStateChange = function (toState, toParams, fromState, fromParams) {
                if (toState.name.match(/patient.dashboard.show.*/)) {
                    return fromParams.patientUuid != toParams.patientUuid;
                }
                return true;
            };

            var cleanUpListenerStateChangeStart = $scope.$on('$stateChangeStart', function (event, toState, toParams, fromState, fromParams) {
                if ($scope.showSaveConfirmDialogConfig) {
                    if ($rootScope.hasVisitedConsultation && $scope.shouldDisplaySaveConfirmDialogForStateChange(toState, toParams, fromState, fromParams)) {
                        if ($scope.showConfirmationPopUp) {
                            event.preventDefault();
                            spinner.hide(toState.spinnerToken);
                            ngDialog.close();
                            $scope.toStateConfig = {
                                toState: toState,
                                toParams: toParams
                            };
                            $scope.displayConfirmationDialog();
                        }
                    }
                }
                setCurrentBoardBasedOnPath();
            });

            $scope.adtNavigationURL = function (visitUuid) {
                return appService.getAppDescriptor().formatUrl($scope.adtNavigationConfig.forwardUrl, {
                    'patientUuid': $scope.patient.uuid,
                    'visitUuid': visitUuid
                });
            };

            var cleanUpListenerErrorsOnForm = $scope.$on("event:errorsOnForm", function () {
                $scope.showConfirmationPopUp = true;
            });

            $scope.displayConfirmationDialog = function (event) {
                if ($rootScope.hasVisitedConsultation && $scope.showSaveConfirmDialogConfig) {
                    if (event) {
                        event.preventDefault();
                        $scope.targetUrl = event.currentTarget.getAttribute('href');
                    }
                    ngDialog.openConfirm({
                        template: '../common/ui-helper/views/saveConfirmation.html',
                        scope: $scope
                    });
                }
            };

            var cleanUpListenerStateChangeSuccess = $scope.$on('$stateChangeSuccess', function (event, toState, toParams, fromState) {
                if (toState.name.match(/patient.dashboard.show.+/)) {
                    $rootScope.hasVisitedConsultation = true;
                    $scope.showConfirmationPopUp = true;
                    if ($scope.showSaveConfirmDialogConfig) {
                        $rootScope.$broadcast("event:pageUnload");
                    }
                }
                if ((toState.name === fromState.name) && (fromState.name === "patient.dashboard.show")) {
                    $rootScope.hasVisitedConsultation = false;
                }
            });
            $scope.$on("$destroy", function () {
                cleanUpListenerStateChangeSuccess();
                cleanUpListenerErrorsOnForm();
                cleanUpListenerStateChangeStart();
            });

            $scope.cancelTransition = function () {
                $scope.showConfirmationPopUp = true;
                ngDialog.close();
                delete $scope.targetUrl;
            };

            $scope.saveAndContinue = function () {
                $scope.showConfirmationPopUp = false;
                $scope.save($scope.toStateConfig);
                $window.onbeforeunload = null;
                ngDialog.close();
            };

            $scope.continueWithoutSaving = function () {
                $scope.showConfirmationPopUp = false;
                if ($scope.targetUrl) {
                    $window.open($scope.targetUrl, "_self");
                }
                $window.onbeforeunload = null;
                $state.go($scope.toStateConfig.toState, $scope.toStateConfig.toParams);
                ngDialog.close();
            };

            var getUrl = function (board) {
                var urlPrefix = urlHelper.getPatientUrl();
                var url = "/" + $stateParams.configName + (board.url ? urlPrefix + "/" + board.url : urlPrefix);
                var queryParams = [];
                if ($state.params.encounterUuid) {
                    queryParams.push("encounterUuid=" + $state.params.encounterUuid);
                }
                if ($state.params.programUuid) {
                    queryParams.push("programUuid=" + $state.params.programUuid);
                }

                if ($state.params.enrollment) {
                    queryParams.push("enrollment=" + $state.params.enrollment);
                }

                if ($state.params.dateEnrolled) {
                    queryParams.push("dateEnrolled=" + $state.params.dateEnrolled);
                }

                if ($state.params.dateCompleted) {
                    queryParams.push("dateCompleted=" + $state.params.dateCompleted);
                }

                var extensionParams = board.extensionParams;
                angular.forEach(extensionParams, function (extensionParamValue, extensionParamKey) {
                    queryParams.push(extensionParamKey + "=" + extensionParamValue);
                });

                if (!_.isEmpty(queryParams)) {
                    url = url + "?" + queryParams.join("&");
                }

                $scope.lastConsultationTabUrl.url = url;
                return $location.url(url);
            };

            $scope.openConsultation = function () {
                if ($scope.showSaveConfirmDialogConfig) {
                    $rootScope.$broadcast("event:pageUnload");
                }
                $scope.closeAllDialogs();
                $scope.collapseControlPanel();
                $rootScope.hasVisitedConsultation = true;
                switchToConsultationTab();
            };

            var switchToConsultationTab = function () {
                if ($scope.lastConsultationTabUrl.url) {
                    $location.url($scope.lastConsultationTabUrl.url);
                } else {
                    getUrl($scope.availableBoards[0]);
                }
            };

            var contextChange = function () {
                return contextChangeHandler.execute();
            };

            var buttonClickAction = function (board) {
                if ($scope.currentBoard === board) {
                    return;
                }
                if (!isFormValid()) {
                    $scope.$parent.$broadcast("event:errorsOnForm");
                    return;
                }

                contextChangeHandler.reset();
                _.map($scope.availableBoards, function (availableBoard) {
                    availableBoard.isSelectedTab = false;
                });

                $scope.currentBoard = board;
                $scope.currentBoard.isSelectedTab = true;
                return getUrl(board);
            };

            var preSavePromise = function () {
                var deferred = $q.defer();
                var observationFilter = new Bahmni.Common.Domain.ObservationFilter();
                $scope.consultation.preSaveHandler.fire();
                $scope.lastvisited = $scope.consultation.lastvisited;
                var selectedObsTemplate = $scope.consultation.selectedObsTemplate;
                var tempConsultation = angular.copy($scope.consultation);
                tempConsultation.observations = observationFilter.filter(tempConsultation.observations);
                tempConsultation.consultationNote = observationFilter.filter([tempConsultation.consultationNote])[0];
                tempConsultation.whoStage = observationFilter.filter([tempConsultation.whoStage])[0];
                tempConsultation.labOrderNote = observationFilter.filter([tempConsultation.labOrderNote])[0];
                addFormObservations(tempConsultation);
                storeTemplatePreference(selectedObsTemplate);
                var visitTypeForRetrospectiveEntries = clinicalAppConfigService.getVisitTypeForRetrospectiveEntries();
                var defaultVisitType = clinicalAppConfigService.getDefaultVisitType();
                var encounterData = new Bahmni.Clinical.EncounterTransactionMapper().map(tempConsultation, $scope.patient, sessionService.getLoginLocationUuid(), retrospectiveEntryService.getRetrospectiveEntry(),
                    visitTypeForRetrospectiveEntries, defaultVisitType, $scope.isInEditEncounterMode(), $state.params.enrollment);
                deferred.resolve(encounterData);
                return deferred.promise;
            };

            var saveConditions = function () {
                return conditionsService.save($scope.consultation.conditions, $scope.patient.uuid)
                    .then(function () {
                        return conditionsService.getConditions($scope.patient.uuid);
                    }).then(function (savedConditions) {
                        return savedConditions;
                    });
            };

            var saveAllergies = function () {
                return allergiesService.save($scope.consultation.allergies, $scope.patient.uuid)
                    .then(function () {
                        return allergiesService.getAllergies($scope.patient.uuid);
                    }).then(function (savedAllergies) {
                        return savedAllergies;
                    });
            };

            var storeTemplatePreference = function (selectedObsTemplate) {
                var templates = [];
                _.each(selectedObsTemplate, function (template) {
                    var templateName = template.formName || template.conceptName;
                    var isTemplateAlreadyPresent = _.find(templates, function (template) {
                        return template === templateName;
                    });
                    if (_.isUndefined(isTemplateAlreadyPresent)) {
                        templates.push(templateName);
                    }
                });

                var data = {
                    "patientUuid": $scope.patient.uuid,
                    "providerUuid": $rootScope.currentProvider.uuid,
                    "templates": templates
                };

                if (!_.isEmpty(templates)) {
                    localStorage.setItem("templatePreference", JSON.stringify(data));
                }
            };

            var discontinuedDrugOrderValidation = function (removableDrugs) {
                var discontinuedDrugOrderValidationMessage;
                _.find(removableDrugs, function (drugOrder) {
                    if (!drugOrder.dateStopped) {
                        if (drugOrder._effectiveStartDate < moment()) {
                            discontinuedDrugOrderValidationMessage = "Please make sure that " + drugOrder.concept.name + " has a stop date between " + DateUtil.getDateWithoutTime(drugOrder._effectiveStartDate) + " and " + DateUtil.getDateWithoutTime(DateUtil.now());
                            return true;
                        } else {
                            discontinuedDrugOrderValidationMessage = drugOrder.concept.name + " should have stop date as today's date since it is a future drug order";
                            return true;
                        }
                    }
                });
                return discontinuedDrugOrderValidationMessage;
            };

            var addFormObservations = function (tempConsultation) {
                if (tempConsultation.observationForms) {
                    _.remove(tempConsultation.observations, function (observation) {
                        return observation.formNamespace;
                    });
                    _.each(tempConsultation.observationForms, function (observationForm) {
                        if (observationForm.component) {
                            var formObservations = observationForm.component.getValue();
                            _.each(formObservations.observations, function (obs) {
                                tempConsultation.observations.push(obs);
                            });
                        }
                    });
                }
            };

            var isObservationFormValid = function () {
                var valid = true;
                _.each($scope.consultation.observationForms, function (observationForm) {
                    if (valid && observationForm.component) {
                        var value = observationForm.component.getValue();
                        if (value.errors) {
                            messagingService.showMessage('error', "{{'CLINICAL_FORM_ERRORS_MESSAGE_KEY' | translate }}");
                            valid = false;
                        }
                    }
                });
                return valid;
            };

            var isFormValid = function () {
                var treatmentStartDateTBValue, treatmentEndDateTBValue, treatmentStartDateINHValue, treatmentEndDateINHValue, treatmenStartDateCTZValue, treatmentEndDateCTZValue, treatmentStartDateFluconazolValue, treatmentEndDateFluconazolValue;

                var treatmentStartDateTB = angular.element("#observation_38")[0];
                var treatmentEndDateTB = angular.element("#observation_40")[0];

                var treatmentStartDateINH = angular.element("#observation_43")[0];
                var treatmentEndDateINH = angular.element("#observation_45")[0];

                var treatmenStartDateCTZ = angular.element("#observation_49")[0];
                var treatmentEndDateCTZ = angular.element("#observation_51")[0];

                var treatmentStartDateFluconazol = angular.element("#observation_55")[0];
                var treatmentEndDateFluconazol = angular.element("#observation_57")[0];

                if (treatmentStartDateTB != undefined) {
                    treatmentStartDateTBValue = treatmentStartDateTB.value;
                }
                if (treatmentEndDateTB != undefined) {
                    treatmentEndDateTBValue = treatmentEndDateTB.value;
                }

                if (treatmentStartDateINH != undefined) {
                    treatmentStartDateINHValue = treatmentStartDateINH.value;
                }
                if (treatmentEndDateINH != undefined) {
                    treatmentEndDateINHValue = treatmentEndDateINH.value;
                }

                if (treatmenStartDateCTZ != undefined) {
                    treatmenStartDateCTZValue = treatmenStartDateCTZ.value;
                }
                if (treatmentEndDateCTZ != undefined) {
                    treatmentEndDateCTZValue = treatmentEndDateCTZ.value;
                }

                if (treatmentStartDateFluconazol != undefined) {
                    treatmentStartDateFluconazolValue = treatmentStartDateFluconazol.value;
                }
                if (treatmentEndDateFluconazol != undefined) {
                    treatmentEndDateFluconazolValue = treatmentEndDateFluconazol.value;
                }

                if ((treatmentEndDateTBValue < treatmentStartDateTBValue && treatmentEndDateTBValue != '') || (treatmentEndDateINHValue < treatmentStartDateINHValue && treatmentEndDateINHValue != '') || (treatmentEndDateCTZValue < treatmenStartDateCTZValue && treatmentEndDateCTZValue != '') || (treatmentEndDateFluconazolValue < treatmentStartDateFluconazolValue && treatmentEndDateFluconazolValue != '')) {
                    messagingService.showMessage('error', "INVALID_TREATMENT_END_DATE");
                    angular.element("#observation_40").css("border", "1px solid red");
                    angular.element("#observation_40").css("background", "#ffcdcd");
                    angular.element("#observation_40").css("outline", "0");
                    return false;
                }
                var contxChange = contextChange();
                var shouldAllow = contxChange["allow"];
                var discontinuedDrugOrderValidationMessage = discontinuedDrugOrderValidation($scope.consultation.discontinuedDrugs);
                if (!shouldAllow) {
                    var errorMessage = contxChange["errorMessage"] ? contxChange["errorMessage"] : "{{'CLINICAL_FORM_ERRORS_MESSAGE_KEY' | translate }}";
                    messagingService.showMessage('error', errorMessage);
                } else if (discontinuedDrugOrderValidationMessage) {
                    var errorMessage = discontinuedDrugOrderValidationMessage;
                    messagingService.showMessage('error', errorMessage);
                }
                return shouldAllow && !discontinuedDrugOrderValidationMessage && isObservationFormValid();
            };

            var copyConsultationToScope = function (consultationWithDiagnosis) {
                consultationWithDiagnosis.preSaveHandler = $scope.consultation.preSaveHandler;
                consultationWithDiagnosis.postSaveHandler = $scope.consultation.postSaveHandler;
                $scope.$parent.consultation = consultationWithDiagnosis;
                $scope.$parent.consultation.postSaveHandler.fire();
                $scope.dashboardDirty = true;
            };

            $scope.save = function (toStateConfig) {
                if (!isFormValid()) {
                    $scope.$parent.$parent.$broadcast("event:errorsOnForm");
                    return $q.when({});
                }
                return spinner.forPromise($q.all([preSavePromise(), encounterService.getEncounterType($state.params.programUuid, sessionService.getLoginLocationUuid())]).then(function (results) {
                    var encounterData = results[0];
                    encounterData.encounterTypeUuid = results[1].uuid;
                    var params = angular.copy($state.params);
                    params.cachebuster = Math.random();
                    _.map(encounterData.drugOrders, function (currentObj) {
                        if (currentObj.orderAttributes && currentObj.orderAttributes.length) {
                            currentObj.orderAttributes.forEach(attribute => {
                                if (attribute.name.toUpperCase() === "Dispensed".toUpperCase() && attribute.value) {
                                    if (currentObj.drug.form == 'ARV') {
                                        if (currentObj.action == 'DISCONTINUE') {
                                            if (!($scope.patient.patientStatus.toUpperCase() === "Pre TARV".toUpperCase())) {
                                                patientService.savePatientStatusState('TARV_TREATMENT_SUSPENDED', $scope.patient.uuid, $rootScope.currentUser.uuid, $scope.patient.patientState);
                                                return;
                                            }
                                        }
                                    }
                                }
                            });
                        }
                    });
                    return encounterService.create(encounterData)
                        .then(function (saveResponse) {
                            var messageParams = {
                                encounterUuid: saveResponse.data.encounterUuid,
                                encounterType: saveResponse.data.encounterType
                            };
                            auditLogService.log($scope.patient.uuid, "EDIT_ENCOUNTER", messageParams, "MODULE_LABEL_CLINICAL_KEY");
                            var consultationMapper = new Bahmni.ConsultationMapper(configurations.dosageFrequencyConfig(), configurations.dosageInstructionConfig(),
                                configurations.consultationNoteConcept(), configurations.whoStageConcept(), configurations.labOrderNotesConcept(), $scope.followUpConditionConcept);
                            var consultation = consultationMapper.map(saveResponse.data);
                            consultation.lastvisited = $scope.lastvisited;
                            return consultation;
                        }).then(function (savedConsultation) {
                            return spinner.forPromise(diagnosisService.populateDiagnosisInformation($scope.patient.uuid, savedConsultation)
                                .then(function (consultationWithDiagnosis) {
                                    return saveConditions().then(function (savedConditions) {
                                        consultationWithDiagnosis.conditions = savedConditions;
                                        messagingService.showMessage('info', "{{'CLINICAL_SAVE_SUCCESS_MESSAGE_KEY' | translate}}");
                                    }, function () {
                                        consultationWithDiagnosis.conditions = $scope.consultation.conditions;
                                    }).then(saveAllergies().then(function (savedAllergies) {
                                        consultationWithDiagnosis.allergies = savedAllergies;
                                        messagingService.showMessage('info', "{{'CLINICAL_SAVE_SUCCESS_MESSAGE_KEY' | translate}}");
                                    }, function () {
                                        consultationWithDiagnosis.conditions = $scope.consultation.conditions;
                                        consultationWithDiagnosis.allergies = $scope.consultation.allergies;
                                    })).then(function () {
                                        copyConsultationToScope(consultationWithDiagnosis);
                                        if ($scope.targetUrl) {
                                            return $window.open($scope.targetUrl, "_self");
                                        }
                                        return $state.transitionTo(toStateConfig ? toStateConfig.toState : $state.current, toStateConfig ? toStateConfig.toParams : params, {
                                            inherit: false,
                                            notify: true,
                                            reload: true
                                        });
                                    });
                                }));
                        }).catch(function (error) {
                            var message = Bahmni.Clinical.Error.translate(error) || "{{'CLINICAL_SAVE_FAILURE_MESSAGE_KEY' | translate}}";
                            messagingService.showMessage('error', message);
                        });
                }));
            };

            function isEmpty (obj) {
                for (var key in obj) {
                    if (obj.hasOwnProperty(key)) {
                        return false;
                    }
                }
                return true;
            }

            $scope.dispenseddrug = function () {
                $http.get(Bahmni.Common.Constants.dispenseDrugOrderUrl, {
                    params: {
                        locId: 16,
                        patientUuid: $scope.patient.uuid
                    },
                    withCredentials: true
                }).then(function (results) {
                    $rootScope.dispenseData = results.data;

                    if (isEmpty(results.data)) {
                        $rootScope.arvdispenseddate = null;
                    } else {
                        $rootScope.arvdispenseddate = results.data[0].dispensed_date;
                    }
                });
            };

            $scope.dispenseddrug();

            $scope.filterTabByProviderType = function (boardIndex) {
                if (currentProviderType == "APSS") {
                    if ($scope.availableBoards[boardIndex].translationKey == 'DIAGNOSIS_BOARD_LABEL_KEY' ||
                        $scope.availableBoards[boardIndex].translationKey == 'ORDERS_BOARD_LABEL_KEY' ||
                        $scope.availableBoards[boardIndex].translationKey == 'MEDICATIONS_BOARD_LABEL_KEY'
                    ) {
                        return false;
                    }
                }
                return true;
            };
            initialize();
        }
    ]);
