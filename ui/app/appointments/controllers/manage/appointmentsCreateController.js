'use strict';

angular.module('bahmni.appointments')
    .controller('AppointmentsCreateController', ['$scope', '$q', '$window', '$state', '$translate', 'spinner', 'patientService',
        'appointmentsService', 'appointmentsServiceService', 'messagingService',
        'ngDialog', 'appService', '$stateParams', 'appointmentCreateConfig', 'appointmentContext', '$http', 'sessionService',
        function ($scope, $q, $window, $state, $translate, spinner, patientService, appointmentsService, appointmentsServiceService,
                  messagingService, ngDialog, appService, $stateParams, appointmentCreateConfig, appointmentContext, $http, sessionService) {
            $scope.isFilterOpen = $stateParams.isFilterOpen;
            $scope.showConfirmationPopUp = true;
            $scope.enableSpecialities = appService.getAppDescriptor().getConfigValue('enableSpecialities');
            $scope.enableServiceTypes = appService.getAppDescriptor().getConfigValue('enableServiceTypes');
            $scope.today = Bahmni.Common.Util.DateUtil.getDateWithoutTime(Bahmni.Common.Util.DateUtil.now());
            $scope.timeRegex = Bahmni.Appointments.Constants.regexForTime;
            $scope.warning = {};
            $scope.minDuration = Bahmni.Appointments.Constants.minDurationForAppointment;
            $scope.appointmentCreateConfig = appointmentCreateConfig;
            $scope.enableEditService = appService.getAppDescriptor().getConfigValue('isServiceOnAppointmentEditable');
            $scope.showStartTimes = [];
            $scope.showEndTimes = [];
            var patientSearchURL = appService.getAppDescriptor().getConfigValue('patientSearchUrl');
            var loginLocationUuid = sessionService.getLoginLocationUuid();
            $scope.minCharLengthToTriggerPatientSearch = appService.getAppDescriptor().getConfigValue('minCharLengthToTriggerPatientSearch') || 3;
            $scope.appointmentBlocks = appService.getAppDescriptor().getConfigValue('appointmentBlocks');
            $scope.canSave = true;
            $scope.invalidField = false;

            $scope.setBlockTimes = function () {
                $scope.appointment.startTime = $scope.selectedAppointmentBlock.startTime;
                $scope.appointment.endTime = $scope.selectedAppointmentBlock.endTime;

                angular.element("#appointmentBlock").css("border", "1px solid #DDD");
                angular.element("#appointmentBlock").css("background", "#fff");
                angular.element("#appointmentBlock").css("outline", "0");
                $scope.canSave = true;
            };

            var isProviderNotAvailableForAppointments = function (selectedProvider) {
                var providers = appointmentCreateConfig.providers;
                return _.isUndefined(_.find(providers, function (provider) {
                    return selectedProvider.uuid === provider.uuid;
                }));
            };
            var init = function () {
                wireAutocompleteEvents();
                if (!_.isEmpty(appointmentContext) && !_.isEmpty(appointmentContext.appointment) && !_.isEmpty(appointmentContext.appointment.provider)) {
                    var isProviderNotAvailable = isProviderNotAvailableForAppointments(appointmentContext.appointment.provider);
                    if (isProviderNotAvailable) {
                        appointmentContext.appointment.provider.person = { display: appointmentContext.appointment.provider.name };
                        appointmentCreateConfig.providers.push(appointmentContext.appointment.provider);
                    }
                }
                $scope.appointment = Bahmni.Appointments.AppointmentViewModel.create(appointmentContext.appointment || { appointmentKind: 'Scheduled' }, appointmentCreateConfig);
                $scope.selectedService = appointmentCreateConfig.selectedService;
                $scope.isPastAppointment = $scope.isEditMode() ? Bahmni.Common.Util.DateUtil.isBeforeDate($scope.appointment.date, moment().startOf('day')) : false;
                if ($state.params.patient) {
                    $scope.appointment.patient = $state.params.patient;
                }
                $scope.appointment.date = $stateParams.selectedAppointmentDate || null;
                $scope.selectedAppointmentBlock = $stateParams.selectedAppointmentBlock;
                if ($scope.selectedAppointmentBlock) {
                    $scope.appointment.startTime = $scope.selectedAppointmentBlock.startTime;
                    $scope.appointment.endTime = $scope.selectedAppointmentBlock.endTime;
                }
                if ($scope.appointment.patient) {
                    $scope.onSelectPatient($scope.appointment.patient);
                }
            };

            var checkInvalidFields = function () {
                $scope.patientIdValue = angular.element("#patientID")[0].value;
                $scope.serviceValue = angular.element("#service")[0].value;
                $scope.dateValue = angular.element("#date")[0].value;
                $scope.appointmentBlockValue = angular.element("#appointmentBlock")[0].value;

                if ($scope.patientIdValue === undefined || $scope.patientIdValue === "") {
                    angular.element("#patientID").css("border", "1px solid red");
                    angular.element("#patientID").css("background", "#ffcdcd");
                    angular.element("#patientID").css("outline", "0");
                    $scope.canSave = false;
                }
                if ($scope.serviceValue === undefined || $scope.serviceValue === "") {
                    angular.element("#service").css("border", "1px solid red");
                    angular.element("#service").css("background", "#ffcdcd");
                    angular.element("#service").css("outline", "0");
                    $scope.canSave = false;
                }
                if ($scope.createAppointmentForm.date.$invalid || $scope.dateValue < $scope.today) {
                    angular.element("#date").css("border", "1px solid red");
                    angular.element("#date").css("background", "#ffcdcd");
                    angular.element("#date").css("outline", "0");
                    $scope.canSave = false;
                }
                if ($scope.appointmentBlockValue === undefined || $scope.appointmentBlockValue === "") {
                    angular.element("#appointmentBlock").css("border", "1px solid red");
                    angular.element("#appointmentBlock").css("background", "#ffcdcd");
                    angular.element("#appointmentBlock").css("outline", "0");
                    $scope.canSave = false;
                }
            };

            $scope.save = function () {
                checkInvalidFields();
                var message;
                if ($scope.createAppointmentForm.$invalid) {
                    message = $scope.createAppointmentForm.$error.pattern
                        ? 'INVALID_TIME_ERROR_MESSAGE' : 'INVALID_SERVICE_FORM_ERROR_MESSAGE';
                } else if (!moment($scope.appointment.startTime, 'hh:mm a')
                    .isBefore(moment($scope.appointment.endTime, 'hh:mm a'), 'minutes')) {
                    message = 'TIME_SEQUENCE_ERROR_MESSAGE';
                } else if ($scope.invalidChosenDate) {
                    message = 'APPOINTMENT_INVALID_DATE';
                }
                if (message) {
                    messagingService.showMessage('error', message);
                    return;
                }

                $scope.validatedAppointment = Bahmni.Appointments.Appointment.create($scope.appointment);
                $scope.conflictingAppointments = $scope.patientAppointments;
                $scope.conflictingAppointmentsArray = [];
                var dia = dateUtil.getDateWithoutTime($scope.appointment.date);
                for (var i = 0; i <= $scope.conflictingAppointments.length; i++) {
                    if ($scope.conflictingAppointments[i] == undefined) { }
                    else if (dateUtil.getDateWithoutTime($scope.conflictingAppointments[i].startDateTime) == dia) {
                        $scope.conflictingAppointmentsArray.push($scope.conflictingAppointments[i].service.uuid);
                    }
                }
                if ($scope.conflictingAppointmentsArray.length === 0 || $scope.conflictingAppointmentsArray.includes($scope.validatedAppointment.serviceUuid) === false) {
                    saveAppointment($scope.validatedAppointment);
                }
                else if ($scope.conflictingAppointmentsArray.length !== 0 && $scope.conflictingAppointmentsArray.includes($scope.validatedAppointment.serviceUuid) === true) {
                    $scope.allow = true;
                    $scope.displayConflictConfirmationDialog();
                }
                else {
                    $scope.displayConflictConfirmationDialog();
                }
            };

            $scope.saveContinue = function () {
                checkInvalidFields();
                var message;
                if ($scope.createAppointmentForm.$invalid) {
                    message = $scope.createAppointmentForm.$error.pattern
                        ? 'INVALID_TIME_ERROR_MESSAGE' : 'INVALID_SERVICE_FORM_ERROR_MESSAGE';
                } else if (!moment($scope.appointment.startTime, 'hh:mm a')
                    .isBefore(moment($scope.appointment.endTime, 'hh:mm a'), 'minutes')) {
                    message = 'TIME_SEQUENCE_ERROR_MESSAGE';
                } else if ($scope.invalidChosenDate) {
                    message = 'APPOINTMENT_INVALID_DATE';
                }
                if (message) {
                    messagingService.showMessage('error', message);
                    return;
                }
                $scope.validatedAppointment = Bahmni.Appointments.Appointment.create($scope.appointment);
                $scope.conflictingAppointments = $scope.patientAppointments;
                $scope.conflictingAppointmentsArray = [];
                var dia = dateUtil.getDateWithoutTime($scope.appointment.date);
                for (var i = 0; i <= $scope.conflictingAppointments.length; i++) {
                    if ($scope.conflictingAppointments[i] == undefined) { }
                    else if (dateUtil.getDateWithoutTime($scope.conflictingAppointments[i].startDateTime) == dia) {
                        $scope.conflictingAppointmentsArray.push($scope.conflictingAppointments[i].service.uuid);
                    }
                }
                if ($scope.conflictingAppointmentsArray.length === 0 || $scope.conflictingAppointmentsArray.includes($scope.validatedAppointment.serviceUuid) === false) {
                    saveAppointmentContinue($scope.validatedAppointment);
                }
                else if ($scope.conflictingAppointmentsArray.length !== 0 && $scope.conflictingAppointmentsArray.includes($scope.validatedAppointment.serviceUuid) === true) {
                    $scope.allow = true;
                    $scope.displayConflictConfirmationDialog();
                }
                else {
                    $scope.displayConflictConfirmationDialog();
                }
            };

            $scope.search = function () {
                var formattedUrl;
                if (patientSearchURL && !_.isEmpty(patientSearchURL)) {
                    var params = {
                        'loginLocationUuid': loginLocationUuid,
                        'searchValue': $scope.appointment.patient.label
                    };
                    formattedUrl = appService.getAppDescriptor().formatUrl(patientSearchURL, params);
                }
                return (spinner.forPromise(formattedUrl ? $http.get(Bahmni.Common.Constants.RESTWS_V1 + formattedUrl) : patientService.statusBasedSearch($scope.appointment.patient.label)).then(function (response) {
                    return response.data.pageOfResults;
                }));
            };

            $scope.timeSource = function () {
                return $q(function (resolve) {
                    resolve($scope.showStartTimes);
                });
            };

            $scope.endTimeSlots = function () {
                return $q(function (resolve) {
                    resolve($scope.showEndTimes);
                });
            };

            $scope.onSelectPatient = function (data) {
                if (data) {
                    angular.element("#patientID").css("border", "1px solid #DDD");
                    angular.element("#patientID").css("background", "#fff");
                    angular.element("#patientID").css("outline", "0");
                    $scope.canSave = true;
                }
                $scope.appointment.patient = data;
                return spinner.forPromise(appointmentsService.search({ patientUuid: data.uuid }).then(function (oldAppointments) {
                    $scope.patientAppointments = oldAppointments.data;
                }));
            };

            $scope.onDateChange = function () {
                $scope.dateValue = angular.element("#date")[0].value;
                if ($scope.dateValue >= $scope.today) {
                    angular.element("#date").css("border", "1px solid #DDD");
                    angular.element("#date").css("background", "#fff");
                    angular.element("#date").css("outline", "0");
                    $scope.canSave = true;
                } else {
                    angular.element("#date").css("border", "1px solid red");
                    angular.element("#date").css("background", "#ffcdcd");
                    angular.element("#date").css("outline", "0");
                    $scope.canSave = false;
                }
            };

            var clearSlotsInfo = function () {
                delete $scope.currentLoad;
                delete $scope.maxAppointmentsLimit;
            };

            var getSlotsInfo = function () {
                var daysOfWeek = ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'];
                var selectedService = $scope.selectedService;
                var appointment = $scope.appointment;
                var startDateTime, endDateTime;
                var availabilityObject;
                clearSlotsInfo();
                if (!_.isEmpty(selectedService.weeklyAvailability)) {
                    var availability = _.find(selectedService.weeklyAvailability, function (avb) {
                        return daysOfWeek[appointment.date.getDay()] === avb.dayOfWeek &&
                            moment(avb.startTime, 'hh:mm a') <= moment(appointment.startTime, 'hh:mm a') &&
                            moment(appointment.endTime, 'hh:mm a') <= moment(avb.endTime, 'hh:mm a');
                    });
                    if (availability) {
                        availabilityObject = availability;
                        availabilityObject.durationMins = selectedService.durationMins || $scope.minDuration;
                    }
                } else {
                    if (moment(selectedService.startTime || "00:00", 'hh:mm a') <= moment(appointment.startTime, 'hh:mm a') &&
                        moment(appointment.endTime, 'hh:mm a') <= moment(selectedService.endTime || "23:59", 'hh:mm a')) {
                        availabilityObject = selectedService;
                    }
                }
                if (availabilityObject) {
                    $scope.maxAppointmentsLimit = availabilityObject.maxAppointmentsLimit || calculateMaxLoadFromDuration(availabilityObject);
                    startDateTime = getDateTime(appointment.date, availabilityObject.startTime || "00:00");
                    endDateTime = getDateTime(appointment.date, availabilityObject.endTime || "23:59");
                    appointmentsServiceService.getServiceLoad(selectedService.uuid, startDateTime, endDateTime).then(function (response) {
                        $scope.currentLoad = response.data;
                    });
                }
            };

            var dateUtil = Bahmni.Common.Util.DateUtil;
            var calculateMaxLoadFromDuration = function (avb) {
                if (avb.durationMins && avb.startTime && avb.endTime) {
                    var startTime = moment(avb.startTime, ["hh:mm a"]);
                    var endTime = moment(avb.endTime, ["hh:mm a"]);
                    return Math.round((dateUtil.diffInMinutes(startTime, endTime)) / avb.durationMins);
                }
            };

            var getDateTime = function (date, time) {
                var formattedTime = moment(time, ["hh:mm a"]).format("HH:mm");
                return dateUtil.parseServerDateToDate(dateUtil.getDateWithoutTime(date) + ' ' + formattedTime);
            };

            var isAppointmentTimeWithinServiceAvailability = function (appointmentTime) {
                if ($scope.weeklyAvailabilityOnSelectedDate && $scope.weeklyAvailabilityOnSelectedDate.length) {
                    return _.find($scope.weeklyAvailabilityOnSelectedDate, function (availability) {
                        return !(moment(appointmentTime, 'hh:mm a').isBefore(moment(availability.startTime, 'hh:mm a')) ||
                            moment(availability.endTime, 'hh:mm a').isBefore(moment(appointmentTime, 'hh:mm a')));
                    });
                } else if ($scope.allowedStartTime || $scope.allowedEndTime) {
                    return !(moment(appointmentTime, 'hh:mm a').isBefore(moment($scope.allowedStartTime, 'hh:mm a')) ||
                        moment($scope.allowedEndTime, 'hh:mm a').isBefore(moment(appointmentTime, 'hh:mm a')));
                }
                return true;
            };

            var isAppointmentStartTimeAndEndTimeWithinServiceAvailability = function () {
                var appointmentStartTime = $scope.appointment.startTime;
                var appointmentEndTime = $scope.appointment.endTime;

                if ($scope.weeklyAvailabilityOnSelectedDate && $scope.weeklyAvailabilityOnSelectedDate.length) {
                    return _.find($scope.weeklyAvailabilityOnSelectedDate, function (availability) {
                        return (moment(availability.startTime, 'hh:mm a') <= moment(appointmentStartTime, 'hh:mm a')) &&
                            (moment(appointmentEndTime, 'hh:mm a') <= moment(availability.endTime, 'hh:mm a'));
                    });
                }
                return true;
            };

            var filterTimingsBasedOnInput = function (enteredNumber, allowedList) {
                var showTimes = [];

                _.each(allowedList, function (time) {
                    (time.startsWith(enteredNumber) || (time.indexOf(enteredNumber) === 1 && (time.indexOf(0) === 0))) && showTimes.push(time);
                });

                return showTimes.length === 0 ? allowedList : showTimes;
            };

            $scope.onKeyDownOnStartTime = function () {
                $scope.showStartTimes = filterTimingsBasedOnInput($scope.appointment.startTime, $scope.startTimes);
            };

            $scope.onKeyDownOnEndTime = function () {
                $scope.showEndTimes = filterTimingsBasedOnInput($scope.appointment.endTime, $scope.endTimes);
            };

            $scope.onSelectStartTime = function (data) {
                $scope.warning.startTime = !isAppointmentTimeWithinServiceAvailability($scope.appointment.startTime);
                if (moment($scope.appointment.startTime, 'hh:mm a', true).isValid()) {
                    $scope.appointment.endTime = moment($scope.appointment.startTime, 'hh:mm a').add($scope.minDuration, 'm').format('hh:mm a');
                    $scope.onSelectEndTime();
                }
            };

            var isSelectedSlotOutOfRange = function () {
                if ($scope.appointment.startTime && !($scope.warning.appointmentDate || $scope.warning.startTime || $scope.warning.endTime)) {
                    return !isAppointmentStartTimeAndEndTimeWithinServiceAvailability();
                }
                return false;
            };

            $scope.onSelectEndTime = function (data) {
                $scope.warning.endTime = false;
                $scope.checkAvailability();
                $scope.warning.endTime = !isAppointmentTimeWithinServiceAvailability($scope.appointment.endTime);
                $scope.warning.outOfRange = isSelectedSlotOutOfRange();
            };

            var triggerSlotCalculation = function () {
                if ($scope.appointment &&
                    $scope.appointment.service &&
                    $scope.appointment.date &&
                    $scope.appointment.startTime &&
                    $scope.appointment.endTime &&
                    _.isEmpty($scope.selectedService.serviceTypes)
                ) {
                    getSlotsInfo();
                }
            };

            $scope.responseMap = function (data) {
                return _.map(data, function (patientInfo) {
                    patientInfo.label = patientInfo.givenName + (patientInfo.familyName ? " " + patientInfo.familyName : "") + " " + "(" + patientInfo.identifier + ")";
                    return patientInfo;
                });
            };

            var clearAvailabilityInfo = function () {
                $scope.warning.appointmentDate = false;
                $scope.warning.startTime = false;
                $scope.warning.endTime = false;
                $scope.warning.outOfRange = false;
                clearSlotsInfo();
            };

            $scope.onSpecialityChange = function () {
                if (!$scope.appointment.specialityUuid) {
                    delete $scope.appointment.specialityUuid;
                }
                delete $scope.selectedService;
                delete $scope.appointment.service;
                delete $scope.appointment.serviceType;
                delete $scope.appointment.location;
                clearAvailabilityInfo();
            };

            $scope.onServiceChange = function () {
                clearAvailabilityInfo();
                delete $scope.weeklyAvailabilityOnSelectedDate;
                if ($scope.appointment.service) {
                    angular.element("#service").css("border", "1px solid #DDD");
                    angular.element("#service").css("background", "#fff");
                    angular.element("#service").css("outline", "0");
                    $scope.canSave = true;
                    setServiceDetails($scope.appointment.service).then(function () {
                        $scope.onSelectStartTime();
                    });
                }
            };

            $scope.onServiceTypeChange = function () {
                if ($scope.appointment.serviceType) {
                    $scope.minDuration = $scope.appointment.serviceType.duration || $scope.minDuration;
                    clearAvailabilityInfo();
                    $scope.onSelectStartTime();
                }
            };

            var getWeeklyAvailabilityOnADate = function (date, weeklyAvailability) {
                var dayOfWeek = moment(date).format('dddd').toUpperCase();
                return _.filter(weeklyAvailability, function (o) {
                    return o.dayOfWeek === dayOfWeek;
                });
            };

            var setServiceAvailableTimesForADate = function (date) {
                $scope.allowedStartTime = $scope.selectedService.startTime || '12:00 am';
                $scope.allowedEndTime = $scope.selectedService.endTime || '11:59 pm';

                if ($scope.selectedService.weeklyAvailability && $scope.selectedService.weeklyAvailability.length > 0) {
                    $scope.weeklyAvailabilityOnSelectedDate = getWeeklyAvailabilityOnADate(date, $scope.selectedService.weeklyAvailability);
                    if ($scope.weeklyAvailabilityOnSelectedDate && $scope.weeklyAvailabilityOnSelectedDate.length === 0) {
                        $scope.allowedStartTime = undefined;
                        $scope.allowedEndTime = undefined;
                    }
                }
            };

            var isServiceAvailableOnWeekDate = function (dayOfWeek, weeklyAvailability) {
                return _.find(weeklyAvailability, function (wA) {
                    return wA.dayOfWeek === dayOfWeek;
                });
            };

            $scope.checkAvailability = function () {
                $scope.warning.appointmentDate = false;
                if (!$scope.isPastAppointment && $scope.selectedService && $scope.appointment.date) {
                    setServiceAvailableTimesForADate($scope.appointment.date);
                    var dayOfWeek = moment($scope.appointment.date).format('dddd').toUpperCase();
                    var allSlots;
                    if (!_.isEmpty($scope.selectedService.weeklyAvailability)) {
                        allSlots = getSlotsForWeeklyAvailability(dayOfWeek, $scope.selectedService.weeklyAvailability, $scope.minDuration);
                        $scope.warning.appointmentDate = !isServiceAvailableOnWeekDate(dayOfWeek, $scope.selectedService.weeklyAvailability);
                    } else {
                        allSlots = getAllSlots($scope.selectedService.startTime, $scope.selectedService.endTime, $scope.minDuration);
                    }
                    $scope.startTimes = allSlots.startTime;
                    $scope.endTimes = allSlots.endTime;
                    $scope.warning.endTime = !isAppointmentTimeWithinServiceAvailability($scope.appointment.endTime);
                    $scope.warning.startTime = !isAppointmentTimeWithinServiceAvailability($scope.appointment.startTime);
                    $scope.warning.outOfRange = isSelectedSlotOutOfRange();
                    triggerSlotCalculation();
                }
            };

            var setServiceDetails = function (service) {
                return appointmentsServiceService.getService(service.uuid).then(
                    function (response) {
                        $scope.selectedService = response.data;
                        $scope.appointment.location = _.find(appointmentCreateConfig.locations, { uuid: $scope.selectedService.location.uuid });
                        $scope.minDuration = response.data.durationMins || Bahmni.Appointments.Constants.minDurationForAppointment;
                    });
            };

            $scope.continueWithoutSaving = function () {
                $scope.showConfirmationPopUp = false;
                $state.go($scope.toStateConfig.toState, $scope.toStateConfig.toParams, { reload: true });
                ngDialog.close();
            };

            $scope.continueWithSaving = function () {
                saveAppointment($scope.validatedAppointment);
                ngDialog.close();
            };

            $scope.cancelTransition = function () {
                $scope.showConfirmationPopUp = true;
                ngDialog.close();
            };

            $scope.displayConfirmationDialog = function () {
                ngDialog.openConfirm({
                    template: 'views/admin/appointmentServiceNavigationConfirmation.html',
                    scope: $scope,
                    closeByEscape: true
                });
            };

            $scope.displayConflictConfirmationDialog = function () {
                ngDialog.openConfirm({
                    template: 'views/manage/appointmentConflictConfirmation.html',
                    scope: $scope,
                    closeByEscape: true
                });
            };

            $scope.$on("$destroy", function () {
                cleanUpListenerStateChangeStart();
            });

            var getSlotsForWeeklyAvailability = function (dayOfWeek, weeklyAvailability, durationInMin) {
                var slots = { startTime: [], endTime: [] };
                var dayAvailability = _.filter(weeklyAvailability, function (o) {
                    return o.dayOfWeek === dayOfWeek;
                });
                dayAvailability = _.sortBy(dayAvailability, 'startTime');
                _.each(dayAvailability, function (day) {
                    var allSlots = getAllSlots(day.startTime, day.endTime, durationInMin);

                    slots.startTime = _.concat(slots.startTime, allSlots.startTime);
                    slots.endTime = _.concat(slots.endTime, allSlots.endTime);
                });
                return slots;
            };

            var getAllSlots = function (startTimeString, endTimeString, durationInMin) {
                startTimeString = _.isEmpty(startTimeString) ? '00:00' : startTimeString;
                endTimeString = _.isEmpty(endTimeString) ? '23:59' : endTimeString;

                var startTime = getFormattedTime(startTimeString);
                var endTime = getFormattedTime(endTimeString);

                var result = [];
                var slots = { startTime: [], endTime: [] };
                var current = moment(startTime);

                while (current.valueOf() <= endTime.valueOf()) {
                    result.push(current.format('hh:mm a'));
                    current.add(durationInMin, 'minutes');
                }

                slots.startTime = _.slice(result, 0, result.length - 1);
                slots.endTime = _.slice(result, 1);

                return slots;
            };

            var getFormattedTime = function (time) {
                return moment(time, 'hh:mm a');
            };

            var isFormFilled = function () {
                return !_.every(_.values($scope.appointment), function (value) {
                    return !value;
                });
            };

            var cleanUpListenerStateChangeStart = $scope.$on('$stateChangeStart',
                function (event, toState, toParams, fromState, fromParams) {
                    if (isFormFilled() && $scope.showConfirmationPopUp) {
                        event.preventDefault();
                        ngDialog.close();
                        $scope.toStateConfig = { toState: toState, toParams: toParams };
                        $scope.displayConfirmationDialog();
                    }
                }
            );

            var newAppointmentStartingEndingBeforeExistingAppointment = function (existingStart, newStart, newEnd) {
                return newEnd <= existingStart;
            };

            var newAppointmentStartingEndingAfterExistingAppointment = function (newStart, existingStart, existingEnd) {
                return newStart >= existingEnd;
            };

            var isNewAppointmentConflictingWithExistingAppointment = function (existingAppointment, newAppointment) {
                var existingStart = moment(existingAppointment.startDateTime),
                    existingEnd = moment(existingAppointment.endDateTime);
                var newStart = moment(newAppointment.startDateTime),
                    newEnd = moment(newAppointment.endDateTime);
                return !(newAppointmentStartingEndingBeforeExistingAppointment(existingStart, newStart, newEnd) ||
                    newAppointmentStartingEndingAfterExistingAppointment(newStart, existingStart, existingEnd));
            };

            var checkForConflict = function (existingAppointment, newAppointment) {
                var isOnSameDay = moment(existingAppointment.startDateTime).diff(moment(newAppointment.startDateTime), 'days') === 0;
                var isAppointmentTimingConflicted = isNewAppointmentConflictingWithExistingAppointment(existingAppointment, newAppointment);
                /* var conflicted = existingAppointment.uuid !== newAppointment.uuid && existingAppointment.status !== 'Cancelled' && isOnSameDay;
                console.log(conflicted); */
                var isAppointmentSameService = existingAppointment.service.uuid === newAppointment.serviceUuid || existingAppointment.service.uuid === $scope.appointment.service.uuid;
                $scope.allow = false;

                if (isOnSameDay === true && isAppointmentSameService === true) {
                    $scope.allow = true;
                    return true;
                }
                else {
                    return existingAppointment.uuid !== newAppointment.uuid &&
                        existingAppointment.status !== 'Cancelled' &&
                        isOnSameDay && isAppointmentTimingConflicted;
                }
            };

            var getConflictingAppointments = function (appointment) {
                return _.filter($scope.patientAppointments, function (bookedAppointment) {
                    return checkForConflict(bookedAppointment, appointment);
                });
            };

            var saveAppointment = function (appointment) {
                return spinner.forPromise(appointmentsService.save(appointment).then(function () {
                    messagingService.showMessage('info', 'APPOINTMENT_SAVE_SUCCESS');
                    $scope.showConfirmationPopUp = false;
                    var params = $state.params;
                    params.viewDate = moment($scope.appointment.date).startOf('day').toDate();
                    params.isFilterOpen = true;
                    params.isSearchEnabled = params.isSearchEnabled && $scope.isEditMode();
                    params.patient = undefined;
                    $state.go('^', params, { reload: true });
                }));
            };
            var saveAppointmentContinue = function (appointment) {
                return spinner.forPromise(appointmentsService.save(appointment).then(function () {
                    messagingService.showMessage('info', 'APPOINTMENT_SAVE_SUCCESS');
                    $scope.showConfirmationPopUp = false;
                    var params = $state.params;
                    params.isFilterOpen = true;
                    params.isSearchEnabled = params.isSearchEnabled && $scope.isEditMode();
                    params.patient = $scope.appointment.patient;
                    params.selectedAppointmentDate = $scope.appointment.date;
                    params.selectedAppointmentBlock = $scope.selectedAppointmentBlock;
                    $state.go('home.manage.appointments.list.new', params, { reload: true });
                }));
            };

            var wireAutocompleteEvents = function () {
                $("#endTimeID").bind('focus', function () {
                    $("#endTimeID").autocomplete("search");
                });
                var $startTimeID = $("#startTimeID");
                $startTimeID.bind('focus', function () {
                    $("#startTimeID").autocomplete("search");
                });
                $startTimeID.bind('focusout', function () {
                    $scope.onSelectStartTime();
                });
            };

            $scope.validateDate = function () {
                var chosenDate = Bahmni.Common.Util.DateUtil.getDateWithoutTime($scope.appointment.date);

                var today = new Date($scope.today);
                var selectedDate = new Date(chosenDate);
                if ((chosenDate != null && selectedDate.getTime() < today.getTime()) || selectedDate.getUTCFullYear() === 1970) {
                    $scope.invalidChosenDate = true;
                    angular.element("#date").css("border", "2px solid #ff3434");
                    angular.element("#date").css("background", "#ffcdcd");
                } else {
                    $scope.invalidChosenDate = false;
                    angular.element("#date").css("border", "1px solid #d1d1d1");
                    angular.element("#date").css("background", "#fff");
                }
            };

            $scope.isEditMode = function () {
                return $scope.appointment.uuid;
            };

            $scope.isEditAllowed = function () {
                return $scope.isPastAppointment ? false : ($scope.appointment.status === 'Scheduled' || $scope.appointment.status === 'CheckedIn');
            };

            $scope.navigateToPreviousState = function () {
                var params = $state.params;
                params.patient = undefined;
                $state.go('^', $state.params, { reload: true });
            };

            return init();
        }]);
