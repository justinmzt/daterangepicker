/**
* @version: 3.0.5
* @author: Dan Grossman http://www.dangrossman.info/
* @copyright: Copyright (c) 2012-2019 Dan Grossman. All rights reserved.
* @license: Licensed under the MIT license. See http://www.opensource.org/licenses/mit-license.php
* @website: http://www.daterangepicker.com/
*/
// Following the UMD template https://github.com/umdjs/umd/blob/master/templates/returnExportsGlobal.js
(function (root, factory) {
    if (typeof define === 'function' && define.amd) {
        // AMD. Make globaly available as well
        define(['moment', 'jquery'], function (moment, jquery) {
            if (!jquery.fn) jquery.fn = {}; // webpack server rendering
            if (typeof moment !== 'function' && moment.default) moment = moment.default
            return factory(moment, jquery);
        });
    } else if (typeof module === 'object' && module.exports) {
        // Node / Browserify
        //isomorphic issue
        var jQuery = (typeof window != 'undefined') ? window.jQuery : undefined;
        if (!jQuery) {
            jQuery = require('jquery');
            if (!jQuery.fn) jQuery.fn = {};
        }
        var moment = (typeof window != 'undefined' && typeof window.moment != 'undefined') ? window.moment : require('moment');
        module.exports = factory(moment, jQuery);
    } else {
        // Browser globals
        root.daterangepicker = factory(root.moment, root.jQuery);
    }
}(this, function(moment, $) {

    function delegate(el, evt, sel, handler) {
        el.addEventListener(evt, function(event) {
            var t = event.target;
            while (t && t !== this) {
                if (t.matches(sel)) {
                    handler.call(t, event);
                }
                t = t.parentNode;
            }
        });
    }

    function numFormat(num) {
        return (Math.abs(num) < 10) ? "0" + parseInt(num) : num;
    }

    function getIsoWeek(d) {
        d = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
        d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
        var yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
        return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
    }

    function getWeek(d) {
        d = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
        d.setUTCDate(d.getUTCDate() + 4 - d.getUTCDay());
        var yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
        return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
    }


    function checkBefore(first_date, second_date, type) {
        switch (type) {
            case 'minute':
                return new Date(first_date).setSeconds(0, 0) < new Date(second_date).setSeconds(0, 0);
            case 'day':
                return new Date(first_date).setHours(0, 0, 0, 0) < new Date(second_date).setHours(0, 0, 0, 0);
            default:
                return first_date < second_date
        }
    }

    function checkAfter(first_date, second_date, type) {
        switch (type) {
            case 'minute':
                return new Date(first_date).setSeconds(0, 0) > new Date(second_date).setSeconds(0, 0);
            case 'day':
                return new Date(first_date).setHours(0, 0, 0, 0) > new Date(second_date).setHours(0, 0, 0, 0);
            default:
                return first_date < second_date
        }
    }

    function _updateObject(inputValue, defalutValue) {
        if (defalutValue === null || defalutValue === undefined) {
            defalutValue = inputValue;
        }
        else {
            for (var property in inputValue) {
                if (inputValue[property] && inputValue[property].constructor == Object && typeof defalutValue[property] != "array") {
                    defalutValue[property] = this.updateObject(inputValue[property], defalutValue[property]);
                }
                else if (inputValue[property] != undefined) {
                    defalutValue[property] = inputValue[property];
                }
            }
        }
        return defalutValue;
    }

    function createDom(tagName, props) {
        var dom = document.createElement(tagName);
        if (typeof (props) == "string") {
            dom.className = props;
        }
        else {
            if (props != undefined) {
                if (props.style) {
                    _updateObject(props.style, dom.style);
                    delete props.style;
                }
                _updateObject(props, dom);
            }
        }
        dom.append = function (tagName, props) {
            return dom.appendChild(createDom(tagName, props));
        };
        return dom;
    }

    function DrpCalendarNode(drp, type) {
        this.side = type;
        this.drp = drp;
        this.node = drp.container.append('div', 'drp-calendar ' + type);
        this.tableNode = this.node.append('div', 'calendar-table');
        this.timeNode = this.node.append('div', 'calendar-time');
        return this
    }

    DrpCalendarNode.prototype.hide = function () {
        this.node.classList.add('hide');
    };

    DrpCalendarNode.prototype.show = function () {
        this.node.classList.remove('hide');
    };

    DrpCalendarNode.prototype.hideTimeNode = function () {
        this.timeNode.classList.add('hide');
    };

    DrpCalendarNode.prototype.showTimeNode = function () {
        this.timeNode.classList.remove('hide');
    };

    DrpCalendarNode.prototype.display = function () {
        var drp = this.drp;
        this.tableNode.innerHTML = '';

        var minDate = this.side === 'left' ? drp.minDate : drp.startDate;
        var maxDate = drp.maxDate;
        var selected = this.side === 'left' ? drp.startDate : drp.endDate;
        var arrow = drp.locale.direction === 'ltr' ? {left: 'chevron-left', right: 'chevron-right'} : {left: 'chevron-right', right: 'chevron-left'};

        var table = this.tableNode.append('table', 'table-condensed');

        // render thead
        var thead = table.append('thead');

        var theadTr = thead.append('tr');

        // add empty cell for week number
        if (drp.showWeekNumbers || drp.showISOWeekNumbers){
            theadTr.append('th')
        }

        if ((!minDate || minDate < this.calendar.firstDay) && (!drp.linkedCalendars || this.side === 'left')) {
            this.prevBtn = theadTr.append('th', {
                className: 'prev available',
                innerHTML: '<span></span>'
            });
        }
        else {
            this.prevBtn = null;
            theadTr.append('th');
        }

        var dateTh = theadTr.append('th', {
            colspan: 5,
            class: 'month'
        });

        if (!drp.showDropdowns) {
            dateTh.innerHTML = drp.locale.monthNames[this.calendar[1][1].getMonth()] + " " + this.calendar[1][1].getFullYear();
        }
        else {
            var currentMonth = this.calendar[1][1].getMonth();
            var currentYear = this.calendar[1][1].getFullYear();
            var maxYear = (maxDate && maxDate.getFullYear()) || (drp.maxYear);
            var minYear = (minDate && minDate.getFullYear()) || (drp.minYear);
            var inMinYear = currentYear === minYear;
            var inMaxYear = currentYear === maxYear;

            var monthHtml = '';
            for (var m = 0; m < 12; m++) {
                if ((!inMinYear || (minDate && m >= minDate.getMonth())) && (!inMaxYear || (maxDate && m <= maxDate.getMonth()))) {
                    monthHtml += "<option value='" + m + "'" +
                        (m === currentMonth ? " selected='selected'" : "") +
                        ">" + drp.locale.monthNames[m] + "</option>";
                } else {
                    monthHtml += "<option value='" + m + "'" +
                        (m === currentMonth ? " selected='selected'" : "") +
                        " disabled='disabled'>" + drp.locale.monthNames[m] + "</option>";
                }
            }
            this.monthSelect = dateTh.append('select', {
                className: 'monthselect',
                innerHTML: monthHtml
            });
            var yearHtml = '';
            for (var y = minYear; y <= maxYear; y++) {
                yearHtml += '<option value="' + y + '"' +
                    (y === currentYear ? ' selected="selected"' : '') +
                    '>' + y + '</option>';
            }
            this.yearSelect = dateTh.append('select', {
                className: 'yearselect',
                innerHTML: yearHtml
            });
        }

        if ((!maxDate || maxDate > this.calendar.lastDay) && (!drp.linkedCalendars || this.side === 'right' || drp.singleDatePicker)) {
            this.nextBtn = theadTr.append('th', {
                className: 'next available',
                innerHTML: '<span></span>'
            });
        }
        else {
            this.nextBtn = null;
            theadTr.append('th');
        }

        var weekdayTr = thead.append('tr');

        // add week number label
        if (drp.showWeekNumbers || drp.showISOWeekNumbers) {
            weekdayTr.append('th', {
                className: 'week',
                innerHTML: drp.locale.weekLabel
            })
        }
        drp.locale.daysOfWeek.forEach(dayOfWeek => {
            weekdayTr.append('th', {
                innerHTML: dayOfWeek
            })
        });

        // render tbody
        var tbody = table.append('tbody');

        //adjust maxDate to reflect the maxSpan setting in order to
        //grey out end dates beyond the maxSpan
        if (drp.endDate == null && drp.maxSpan) {
            var maxLimit = new Date(drp.startDate.getTime() + drp.maxSpan);
            maxLimit.setHours(23, 59, 59, 999);
            if (!maxDate || maxLimit < maxDate) {
                maxDate = maxLimit;
            }
        }

        for (var row = 0; row < 6; row++) {
            var tr = tbody.append('tr');

            // add week number
            if (drp.showWeekNumbers) {
                tr.append('td', {
                    className: 'week',
                    innerHTML: getWeek(this.calendar[row][0])
                })
            }
            else if (drp.showISOWeekNumbers) {
                tr.append('td', {
                    className: 'week',
                    innerHTML: getIsoWeek(this.calendar[row][0])
                })
            }

            for (var col = 0; col < 7; col++) {

                var classes = [];

                //highlight today's date
                // origin code with moment.js: calendar[row][col].isSame(new Date(), "day")
                if (new Date(this.calendar[row][col]).setHours(0, 0, 0, 0) === new Date().setHours(0, 0, 0, 0))
                    classes.push('today');

                //highlight weekends
                if ((this.calendar[row][col].getDay() || 7) > 5)
                    classes.push('weekend');

                //grey out the dates in other months displayed at beginning and end of this calendar
                if (this.calendar[row][col].getMonth() !== this.calendar[1][1].getMonth())
                    classes.push('off', 'ends');

                //don't allow selection of dates before the minimum date
                if (this.minDate && checkBefore(this.calendar[row][col], drp.minDate, 'day'))
                    classes.push('off', 'disabled');

                //don't allow selection of dates after the maximum date
                if (maxDate && checkAfter(this.calendar[row][col], maxDate, 'day'))
                    classes.push('off', 'disabled');

                //don't allow selection of date if a custom function decides it's invalid
                if (drp.isInvalidDate(this.calendar[row][col]))
                    classes.push('off', 'disabled');

                //highlight the currently selected start date
                if (drp.locale.formatDate(this.calendar[row][col]) === drp.locale.formatDate(drp.startDate))
                    classes.push('active', 'start-date');

                //highlight the currently selected end date
                if (drp.endDate != null && drp.locale.formatDate(this.calendar[row][col]) === drp.locale.formatDate(drp.endDate))
                    classes.push('active', 'end-date');

                //highlight dates in-between the selected dates
                if (drp.endDate != null && this.calendar[row][col] > drp.startDate && this.calendar[row][col] < drp.endDate)
                    classes.push('in-range');

                //apply custom classes for drp date
                var isCustom = drp.isCustomDate(this.calendar[row][col]);
                if (isCustom !== false) {
                    if (typeof isCustom === 'string')
                        classes.push(isCustom);
                    else
                        Array.prototype.push.apply(classes, isCustom);
                }

                var cname = '', disabled = false;
                for (var i = 0; i < classes.length; i++) {
                    cname += classes[i] + ' ';
                    if (classes[i] === 'disabled')
                        disabled = true;
                }
                if (!disabled)
                    cname += 'available';

                tr.append('td', {
                    className: cname.replace(/^\s+|\s+$/g, ''),
                    'data-title': 'r' + row + 'c' + col,
                    innerHTML: this.calendar[row][col].getDate()
                });
            }
        }

    }


    var DateRangePicker = function(element, options, cb)  {

        //default settings for options
        this.parentEl = document.body;
        this.element = element;
        this.startDate = new Date();
        this.startDate.setHours(0, 0, 0, 0);
        this.endDate = new Date();
        this.endDate.setHours(23, 59, 59, 999);
        this.minDate = false;
        this.maxDate = false;
        this.maxSpan = false;
        this.autoApply = false;
        this.singleDatePicker = false;
        this.showDropdowns = false;
        this.minYear = new Date().getFullYear() - 100;
        this.minYear = new Date().getFullYear() + 100;
        this.showWeekNumbers = false;
        this.showISOWeekNumbers = false;
        this.showCustomRangeLabel = true;
        this.timePicker = false;
        this.timePicker24Hour = false;
        this.timePickerIncrement = 1;
        this.timePickerSeconds = false;
        this.linkedCalendars = true;
        this.autoUpdateInput = true;
        this.alwaysShowCalendars = false;
        this.ranges = {};

        this.opens = 'right';
        if (this.element.classList.contains('pull-right'))
            this.opens = 'left';

        this.drops = 'down';
        if (this.element.classList.contains('dropup'))
            this.drops = 'up';

        this.buttonClasses = 'btn btn-sm';
        this.applyButtonClasses = 'btn-primary';
        this.cancelButtonClasses = 'btn-default';

        this.locale = {
            direction: 'ltr',
            format: function (date) {
                // MM/DD/YYYY
                return numFormat(date.getMonth() + 1) + "/" + numFormat(date.getDate()) + "/" + date.getFullYear();
            },
            formatMonth: function (date) {
                // YYYY-MM
                return date.getFullYear() + "-" + numFormat(date.getMonth() + 1);
            },
            formatDate: function (date) {
                // YYYY-MM-DD
                return date.getFullYear() + "-" + numFormat(date.getMonth() + 1) + "-" + numFormat(date.getDate());
            },
            formatMinute: function (date) {
                // YYYY-MM-DD HH:mm
                return date.getFullYear() + "-" + numFormat(date.getMonth() + 1) + "-" + numFormat(date.getDate()) + " " + numFormat(date.getHours()) + ":" + numFormat(date.getMinutes());
            },
            formatSecond: function (date) {
                // YYYY-MM-DD HH:mm:ss
                return date.getFullYear() + "-" + numFormat(date.getMonth() + 1) + "-" + numFormat(date.getDate()) + " " + numFormat(date.getHours()) + ":" + numFormat(date.getMinutes()) + numFormat(date.getSeconds());
            },
            separator: ' - ',
            applyLabel: 'Apply',
            cancelLabel: 'Cancel',
            weekLabel: 'W',
            customRangeLabel: 'Custom Range',
            daysOfWeek: ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"],
            monthNames: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"],
            firstDay: 0
        };

        this.callback = function() { };

        //some state information
        this.isShowing = false;

        //custom options from user
        if (typeof options !== 'object' || options === null)
            options = {};

        // todo: data attributes could be replaced with dom's property
        //allow setting options with data attributes
        //data-api options will be overwritten with custom javascript options
        // options = $.extend(this.element.data(), options);

        //html template for the picker UI
        // todo: Using function: createDom instead of using HTML String By jQuery
        // if (typeof options.template !== 'string' && !(options.template instanceof $))
        //     options.template =
        //     '<div class="daterangepicker">' +
        //         '<div class="ranges"></div>' +
        //         '<div class="drp-calendar left">' +
        //             '<div class="calendar-table"></div>' +
        //             '<div class="calendar-time"></div>' +
        //         '</div>' +
        //         '<div class="drp-calendar right">' +
        //             '<div class="calendar-table"></div>' +
        //             '<div class="calendar-time"></div>' +
        //         '</div>' +
        //         '<div class="drp-buttons">' +
        //             '<span class="drp-selected"></span>' +
        //             '<button class="cancelBtn" type="button"></button>' +
        //             '<button class="applyBtn" disabled="disabled" type="button"></button> ' +
        //         '</div>' +
        //     '</div>';

        this.parentEl = options.parentEl ? options.parentEl : this.parentEl;
        this.container = createDom('div', 'daterangepicker');
        this.parentEl.appendChild(this.container);

        this.rangesNode = this.container.append('div', 'ranges');

        this.leftCalendar = new DrpCalendarNode(this, 'left');
        this.rightCalendar = new DrpCalendarNode(this, 'right');
        this.buttonsNode = this.container.append('div', 'drp-buttons');
        this.selectedSpanNode = this.buttonsNode.append('span', 'drp-selected');
        this.cancelBtnNode = this.buttonsNode.append('button', {
            className: 'cancelBtn',
            type: 'button'
        });
        this.applyBtnNode = this.buttonsNode.append('button', {
            className: 'applyBtn',
            disabled: 'disabled',
            type: 'button'
        });

        //
        // handle all the possible options overriding defaults
        //

        if (typeof options.locale === 'object') {

            if (typeof options.locale.direction === 'string')
                this.locale.direction = options.locale.direction;

            if (typeof options.locale.format === 'string')
                this.locale.format = options.locale.format;

            if (typeof options.locale.separator === 'string')
                this.locale.separator = options.locale.separator;

            if (typeof options.locale.daysOfWeek === 'object')
                this.locale.daysOfWeek = options.locale.daysOfWeek.slice();

            if (typeof options.locale.monthNames === 'object')
              this.locale.monthNames = options.locale.monthNames.slice();

            if (typeof options.locale.firstDay === 'number')
              this.locale.firstDay = options.locale.firstDay;

            if (typeof options.locale.applyLabel === 'string')
              this.locale.applyLabel = options.locale.applyLabel;

            if (typeof options.locale.cancelLabel === 'string')
              this.locale.cancelLabel = options.locale.cancelLabel;

            if (typeof options.locale.weekLabel === 'string')
              this.locale.weekLabel = options.locale.weekLabel;

            if (typeof options.locale.customRangeLabel === 'string'){
                //Support unicode chars in the custom range name.
                var elem = document.createElement('textarea');
                elem.innerHTML = options.locale.customRangeLabel;
                var rangeHtml = elem.value;
                this.locale.customRangeLabel = rangeHtml;
            }
        }
        this.container.classList.add(this.locale.direction);

        if (typeof options.startDate === 'string')
            this.startDate = new Date(options.startDate);

        if (typeof options.endDate === 'string')
            this.endDate = new Date(options.endDate);

        if (typeof options.minDate === 'string')
            this.minDate = new Date(options.minDate);

        if (typeof options.maxDate === 'string')
            this.maxDate = new Date(options.maxDate);

        if (typeof options.startDate === 'object')
            this.startDate = new Date(options.startDate);

        if (typeof options.endDate === 'object')
            this.endDate = new Date(options.endDate);

        if (typeof options.minDate === 'object')
            this.minDate = new Date(options.minDate);

        if (typeof options.maxDate === 'object')
            this.maxDate = new Date(options.maxDate);

        // sanity check for bad options
        if (this.minDate && this.startDate < this.minDate)
            this.startDate = new Date(this.minDate);

        // sanity check for bad options
        if (this.maxDate && this.endDate > this.maxDate)
            this.endDate = new Date(this.maxDate);

        if (typeof options.applyButtonClasses === 'string')
            this.applyButtonClasses = options.applyButtonClasses;

        if (typeof options.applyClass === 'string') //backwards compat
            this.applyButtonClasses = options.applyClass;

        if (typeof options.cancelButtonClasses === 'string')
            this.cancelButtonClasses = options.cancelButtonClasses;

        if (typeof options.cancelClass === 'string') //backwards compat
            this.cancelButtonClasses = options.cancelClass;

        if (typeof options.maxSpan === 'object')
            this.maxSpan = options.maxSpan;

        if (typeof options.dateLimit === 'object') //backwards compat
            this.maxSpan = options.dateLimit;

        if (typeof options.opens === 'string')
            this.opens = options.opens;

        if (typeof options.drops === 'string')
            this.drops = options.drops;

        if (typeof options.showWeekNumbers === 'boolean')
            this.showWeekNumbers = options.showWeekNumbers;

        if (typeof options.showISOWeekNumbers === 'boolean')
            this.showISOWeekNumbers = options.showISOWeekNumbers;

        if (typeof options.buttonClasses === 'string')
            this.buttonClasses = options.buttonClasses;

        if (typeof options.buttonClasses === 'object')
            this.buttonClasses = options.buttonClasses.join(' ');

        if (typeof options.showDropdowns === 'boolean')
            this.showDropdowns = options.showDropdowns;

        if (typeof options.minYear === 'number')
            this.minYear = options.minYear;

        if (typeof options.maxYear === 'number')
            this.maxYear = options.maxYear;

        if (typeof options.showCustomRangeLabel === 'boolean')
            this.showCustomRangeLabel = options.showCustomRangeLabel;

        if (typeof options.singleDatePicker === 'boolean') {
            this.singleDatePicker = options.singleDatePicker;
            if (this.singleDatePicker)
                this.endDate = new Date(this.startDate);
        }

        if (typeof options.timePicker === 'boolean')
            this.timePicker = options.timePicker;

        if (typeof options.timePickerSeconds === 'boolean')
            this.timePickerSeconds = options.timePickerSeconds;

        if (typeof options.timePickerIncrement === 'number')
            this.timePickerIncrement = options.timePickerIncrement;

        if (typeof options.timePicker24Hour === 'boolean')
            this.timePicker24Hour = options.timePicker24Hour;

        if (typeof options.autoApply === 'boolean')
            this.autoApply = options.autoApply;

        if (typeof options.autoUpdateInput === 'boolean')
            this.autoUpdateInput = options.autoUpdateInput;

        if (typeof options.linkedCalendars === 'boolean')
            this.linkedCalendars = options.linkedCalendars;

        if (typeof options.isInvalidDate === 'function')
            this.isInvalidDate = options.isInvalidDate;

        if (typeof options.isCustomDate === 'function')
            this.isCustomDate = options.isCustomDate;

        if (typeof options.alwaysShowCalendars === 'boolean')
            this.alwaysShowCalendars = options.alwaysShowCalendars;

        // update day names order to firstDay
        if (this.locale.firstDay != 0) {
            var iterator = this.locale.firstDay;
            while (iterator > 0) {
                this.locale.daysOfWeek.push(this.locale.daysOfWeek.shift());
                iterator--;
            }
        }

        var start, end, range;

        //if no start/end dates set, check if an input element contains initial values
        if (typeof options.startDate === 'undefined' && typeof options.endDate === 'undefined') {
            if (this.element.type === 'text') {
                var val = this.element.value,
                    split = val.split(this.locale.separator);

                start = end = null;

                if (split.length === 2) {
                    start = new Date(split[0]); // by Format
                    end = new Date(split[1]); // by Format
                } else if (this.singleDatePicker && val !== "") {
                    start = new Date(val); // by Format
                    end = new Date(val); // by Format
                }
                if (start.getTime() && end.getTime()) {
                    this.setStartDate(start);
                    this.setEndDate(end);
                }
            }
        }

        if (typeof options.ranges === 'object') {
            for (range in options.ranges) {

                if (typeof options.ranges[range][0] === 'string')
                    start = new Date(options.ranges[range][0]); // by Format
                else
                    start = new Date(options.ranges[range][0]);

                if (typeof options.ranges[range][1] === 'string')
                    end = new Date(options.ranges[range][1]); // by Format
                else
                    end = new Date(options.ranges[range][1]);

                // If the start or end date exceed those allowed by the minDate or maxSpan
                // options, shorten the range to the allowable period.
                if (this.minDate && start < this.minDate)
                    start = new Date(this.minDate);

                var maxDate = this.maxDate;
                if (this.maxSpan && maxDate && start.getTime() + this.maxSpan > maxDate.getTime())
                    maxDate = new Date(start.getTime() + this.maxSpan);
                if (maxDate && end > maxDate)
                    end = new Date(maxDate);

                // If the end of the range is before the minimum or the start of the range is
                // after the maximum, don't display this range option at all.
                if ((this.minDate && checkBefore(end, this.minDate,  this.timepicker ? 'minute' : 'day'))
                  || (maxDate && checkAfter(start, maxDate, this.timepicker ? 'minute' : 'day')))
                    continue;

                //Support unicode chars in the range names.
                var elem = document.createElement('textarea');
                elem.innerHTML = range;
                var rangeHtml = elem.value;

                this.ranges[rangeHtml] = [start, end];
            }

            var list = this.container.append('ul');
            for (range in this.ranges) {
                list.append('li', {
                    'data-range-key': range,
                    innerHTML: range
                });
            }
            if (this.showCustomRangeLabel) {
                list.append('li', {
                    'data-range-key': this.locale.customRangeLabel,
                    innerHTML: this.locale.customRangeLabel
                });
            }
        }

        if (typeof cb === 'function') {
            this.callback = cb;
        }

        if (!this.timePicker) {
            this.startDate = new Date(this.startDate);
            this.startDate.setHours(0, 0, 0, 0);

            this.endDate = new Date(this.endDate);
            this.endDate.setHours(23, 59, 59, 999);

            this.leftCalendar.hideTimeNode();
            this.rightCalendar.hideTimeNode();
        }

        //can't be used together for now
        if (this.timePicker && this.autoApply)
            this.autoApply = false;

        if (this.autoApply) {
            this.container.classList.add('auto-apply');
        }

        if (typeof options.ranges === 'object')
            this.container.classList.add('show-ranges');

        if (this.singleDatePicker) {
            this.container.classList.add('single');
            this.leftCalendar.node.classList.add('single');
            this.leftCalendar.show();
            this.rightCalendar.hide();
            if (!this.timePicker) {
                this.container.classList.add('auto-apply');
            }
        }

        if ((typeof options.ranges === 'undefined' && !this.singleDatePicker) || this.alwaysShowCalendars) {
            this.container.classList.add('show-calendar');
        }

        this.container.classList.add('opens' + this.opens);

        //apply CSS classes and labels to buttons
        this.applyBtnNode.classList.add(this.buttonClasses);
        this.cancelBtnNode.classList.add(this.buttonClasses);
        if (this.applyButtonClasses.length)
            this.applyBtnNode.classList.add(this.applyButtonClasses);
        if (this.cancelButtonClasses.length)
            this.cancelBtnNode.classList.add(this.cancelButtonClasses);
        this.applyBtnNode.innerHTML = this.locale.applyLabel;
        this.cancelBtnNode.innerHTML = this.locale.cancelLabel;

        //
        // event listeners
        //

        this.container.find('.drp-calendar')
            .on('click.daterangepicker', '.prev', $.proxy(this.clickPrev, this))
            .on('click.daterangepicker', '.next', $.proxy(this.clickNext, this))
            .on('mousedown.daterangepicker', 'td.available', $.proxy(this.clickDate, this))
            .on('mouseenter.daterangepicker', 'td.available', $.proxy(this.hoverDate, this))
            .on('change.daterangepicker', 'select.yearselect', $.proxy(this.monthOrYearChanged, this))
            .on('change.daterangepicker', 'select.monthselect', $.proxy(this.monthOrYearChanged, this))
            .on('change.daterangepicker', 'select.hourselect,select.minuteselect,select.secondselect,select.ampmselect', $.proxy(this.timeChanged, this))

        this.container.find('.ranges')
            .on('click.daterangepicker', 'li', $.proxy(this.clickRange, this))

        this.container.find('.drp-buttons')
            .on('click.daterangepicker', 'button.applyBtn', $.proxy(this.clickApply, this))
            .on('click.daterangepicker', 'button.cancelBtn', $.proxy(this.clickCancel, this))

        if (this.element.is('input') || this.element.is('button')) {
            this.element.on({
                'click.daterangepicker': $.proxy(this.show, this),
                'focus.daterangepicker': $.proxy(this.show, this),
                'keyup.daterangepicker': $.proxy(this.elementChanged, this),
                'keydown.daterangepicker': $.proxy(this.keydown, this) //IE 11 compatibility
            });
        } else {
            this.element.on('click.daterangepicker', $.proxy(this.toggle, this));
            this.element.on('keydown.daterangepicker', $.proxy(this.toggle, this));
        }

        //
        // if attached to a text input, set the initial value
        //

        this.updateElement();

    };

    DateRangePicker.prototype = {

        constructor: DateRangePicker,

        setStartDate: function(startDate) {
            if (typeof startDate === 'string')
                this.startDate = new Date(startDate); // by Format

            if (typeof startDate === 'object')
                this.startDate = new Date(startDate);

            if (!this.timePicker) {
                this.startDate = new Date(this.startDate);
                this.startDate.setHours(0, 0, 0, 0);
            }

            if (this.timePicker && this.timePickerIncrement)
                this.startDate.setMinutes(Math.round(this.startDate.getMinutes() / this.timePickerIncrement) * this.timePickerIncrement);

            if (this.minDate && this.startDate < this.minDate) {
                this.startDate = new Date(this.minDate);
                if (this.timePicker && this.timePickerIncrement)
                    this.startDate.setMinutes(Math.round(this.startDate.getMinutes() / this.timePickerIncrement) * this.timePickerIncrement);
            }

            if (this.maxDate && this.startDate > this.maxDate) {
                this.startDate = new Date(this.maxDate);
                if (this.timePicker && this.timePickerIncrement)
                    this.startDate.setMinutes(Math.floor(this.startDate.getMinutes() / this.timePickerIncrement) * this.timePickerIncrement);
            }

            if (!this.isShowing)
                this.updateElement();

            this.updateMonthsInView();
        },

        setEndDate: function(endDate) {
            if (typeof endDate === 'string')
                this.endDate = new Date(endDate); // by Format

            if (typeof endDate === 'object')
                this.endDate = new Date(endDate);

            if (!this.timePicker) {
                this.endDate = new Date(this.endDate);
                this.endDate.setHours(23, 59, 59, 999);
            }

            if (this.timePicker && this.timePickerIncrement)
                this.endDate.setMinutes(Math.round(this.endDate.getMinutes() / this.timePickerIncrement) * this.timePickerIncrement);

            if (this.endDate < this.startDate)
                this.endDate = new Date(this.startDate);

            if (this.maxDate && this.endDate > this.maxDate)
                this.endDate = new Date(this.maxDate);

            if (this.maxSpan && this.startDate.getTime() + this.maxSpan < this.endDate.getTime())
                this.endDate = new Date(this.startDate.getTime() + this.maxSpan);

            this.previousRightTime = new Date(this.endDate);

            this.selectedSpanNode.innerHTML = this.locale.format(this.startDate) + this.locale.separator + this.locale.format(this.endDate);

            if (!this.isShowing)
                this.updateElement();

            this.updateMonthsInView();
        },

        isInvalidDate: function() {
            return false;
        },

        isCustomDate: function() {
            return false;
        },

        updateView: function() {
            if (this.timePicker) {
                this.renderTimePicker('left');
                this.renderTimePicker('right');
                if (!this.endDate) {
                    this.container.find('.right .calendar-time select').prop('disabled', true).addClass('disabled');
                } else {
                    this.container.find('.right .calendar-time select').prop('disabled', false).removeClass('disabled');
                }
            }
            if (this.endDate)
                this.selectedSpanNode.innerHTML = this.locale.format(this.startDate) + this.locale.separator + this.locale.format(this.endDate);
            this.updateMonthsInView();
            this.updateCalendars();
            this.updateFormInputs();
        },

        updateMonthsInView: function() {
            if (this.endDate) {

                //if both dates are visible already, do nothing
                if (!this.singleDatePicker && this.leftCalendar.month && this.rightCalendar.month &&
                    (this.locale.formatMonth(this.startDate) === this.locale.formatMonth(this.leftCalendar.month) || this.locale.formatMonth(this.startDate) === this.locale.formatMonth(this.rightCalendar.month))
                    &&
                    (this.locale.formatMonth(this.endDate) === this.locale.formatMonth(this.leftCalendar.month) || this.locale.formatMonth(this.endDate) === this.locale.formatMonth(this.rightCalendar.month))
                    ) {
                    return;
                }

                this.leftCalendar.month = new Date(this.startDate);
                this.leftCalendar.month.setDate(2);
                if (!this.linkedCalendars && (this.endDate.getMonth() !== this.startDate.getMonth() || this.endDate.getFullYear() !== this.startDate.getFullYear())) {
                    this.rightCalendar.month = new Date(this.endDate);
                    this.rightCalendar.month.setDate(2);
                } else {
                    this.rightCalendar.month = new Date(this.startDate);
                    this.rightCalendar.month.setDate(2);
                    this.rightCalendar.month.setMonth(this.rightCalendar.month.getMonth() + 1);
                }

            } else {
                if (this.locale.formatMonth(this.leftCalendar.month) !== this.locale.formatMonth(this.startDate) && this.locale.formatMonth(this.rightCalendar.month) !== this.locale.formatMonth(this.startDate)) {
                    this.leftCalendar.month = new Date(this.startDate);
                    this.leftCalendar.month.setDate(2);
                    this.rightCalendar.month = new Date(this.startDate);
                    this.rightCalendar.month.setDate(2);
                    this.rightCalendar.month.setMonth(this.rightCalendar.month.getMonth() + 1);
                }
            }
            if (this.maxDate && this.linkedCalendars && !this.singleDatePicker && this.rightCalendar.month > this.maxDate) {
                this.rightCalendar.month = new Date(this.maxDate);
                this.rightCalendar.month.setDate(2);
                this.leftCalendar.month = new Date(this.maxDate);
                this.leftCalendar.month.setDate(2);
                this.leftCalendar.month.setMonth(this.leftCalendar.month.getMonth() - 1);
            }
        },

        updateCalendars: function() {

            if (this.timePicker) {
                var hour, minute, second;
                if (this.endDate) {
                    hour = parseInt(this.container.find('.left .hourselect').val(), 10);
                    minute = parseInt(this.container.find('.left .minuteselect').val(), 10);
                    if (isNaN(minute)) {
                        minute = parseInt(this.container.find('.left .minuteselect option:last').val(), 10);
                    }
                    second = this.timePickerSeconds ? parseInt(this.container.find('.left .secondselect').val(), 10) : 0;
                    if (!this.timePicker24Hour) {
                        var ampm = this.container.find('.left .ampmselect').val();
                        if (ampm === 'PM' && hour < 12)
                            hour += 12;
                        if (ampm === 'AM' && hour === 12)
                            hour = 0;
                    }
                } else {
                    hour = parseInt(this.container.find('.right .hourselect').val(), 10);
                    minute = parseInt(this.container.find('.right .minuteselect').val(), 10);
                    if (isNaN(minute)) {
                        minute = parseInt(this.container.find('.right .minuteselect option:last').val(), 10);
                    }
                    second = this.timePickerSeconds ? parseInt(this.container.find('.right .secondselect').val(), 10) : 0;
                    if (!this.timePicker24Hour) {
                        var ampm = this.container.find('.right .ampmselect').val();
                        if (ampm === 'PM' && hour < 12)
                            hour += 12;
                        if (ampm === 'AM' && hour === 12)
                            hour = 0;
                    }
                }
                this.leftCalendar.month.setHours(hour, minute, second);
                this.rightCalendar.month.setHours(hour, minute, second);
            }

            this.renderCalendar('left');
            this.renderCalendar('right');

            //highlight any predefined range matching the current start and end dates
            this.container.find('.ranges li').removeClass('active');
            if (this.endDate == null) return;

            this.calculateChosenLabel();
        },

        renderCalendar: function(side) {

            //
            // Build the matrix of dates that will populate the calendar
            //

            var calendarController = side === 'left' ? this.leftCalendar : this.rightCalendar;
            var month = calendarController.month.getMonth();
            var year = calendarController.month.getFullYear();
            var hour = calendarController.month.getHours();
            var minute = calendarController.month.getMinutes();
            var second = calendarController.month.getSeconds();
            var daysInMonth = new Date(year, month + 1, 0).getDate();
            var firstDay = new Date(year, month, 1);
            var lastDay = new Date(year, month, daysInMonth);

            var lastMonthDate = new Date(firstDay)
            lastMonthDate.setMonth(lastMonthDate.getMonth() - 1);
            var lastMonth = lastMonthDate.getMonth();

            var lastYearDate = new Date(firstDay);
            lastYearDate.setMonth(lastYearDate.getMonth() - 1);
            var lastYear = lastYearDate.getFullYear();
            var daysInLastMonth = new Date(lastYear, lastMonth + 1, 0).getDate();
            var dayOfWeek = firstDay.getDay();

            //initialize a 6 rows x 7 columns array for the calendar
            var calendar = [];
            calendar.firstDay = firstDay;
            calendar.lastDay = lastDay;

            for (var i = 0; i < 6; i++) {
                calendar[i] = [];
            }

            //populate the calendar with date objects
            var startDay = daysInLastMonth - dayOfWeek + this.locale.firstDay + 1;
            if (startDay > daysInLastMonth)
                startDay -= 7;

            if (dayOfWeek == this.locale.firstDay)
                startDay = daysInLastMonth - 6;

            var curDate = new Date(lastYear, lastMonth, startDay, 12, minute, second);

            var col, row;
            for (var i = 0, col = 0, row = 0; i < 42; i++, col++, curDate.setHours(curDate.getHours() + 24)) {
                if (i > 0 && col % 7 === 0) {
                    col = 0;
                    row++;
                }
                calendar[row][col] = new Date(curDate);
                calendar[row][col].setHours(hour, minute, second);
                curDate.setHours(12);

                if (this.minDate && this.locale.formatDate(calendar[row][col]) === this.locale.formatDate(this.minDate) && calendar[row][col] < this.minDate && side === 'left') {
                    calendar[row][col] = new Date(this.minDate);
                }

                if (this.maxDate && this.locale.formatDate(calendar[row][col]) === this.locale.formatDate(this.maxDate) && calendar[row][col] > this.maxDate && side === 'right') {
                    calendar[row][col] = new Date(this.maxDate);
                }

            }

            //make the calendar object available to hoverDate/clickDate
            if (side === 'left') {
                this.leftCalendar.calendar = calendar;
            } else {
                this.rightCalendar.calendar = calendar;
            }

            // Display the calendar
            calendarController.display()

        },

        renderTimePicker: function(side) {

            // Don't bother updating the time picker if it's currently disabled
            // because an end date hasn't been clicked yet
            if (side === 'right' && !this.endDate) return;

            var html, selected, minDate, maxDate = this.maxDate;

            //     maxDate = new Date(start.getTime() + this.maxSpan);

            if (this.maxSpan && (!this.maxDate || this.startDate.getTime() + this.maxSpan < this.maxDate.getTime()))
                maxDate = new Date(this.startDate.getTime() + this.maxSpan);

            if (side === 'left') {
                selected = new Date(this.startDate);
                minDate = this.minDate;
            } else if (side === 'right') {
                selected = new Date(this.endDate);
                minDate = this.startDate;

                //Preserve the time already selected
                var timeSelector = this.container.find('.drp-calendar.right .calendar-time');
                if (timeSelector.html() !== '') {

                    selected.setHours(!isNaN(selected.getHours()) ? selected.getHours() : timeSelector.find('.hourselect option:selected').val());
                    selected.setMinutes(!isNaN(selected.getMinutes()) ? selected.getMinutes() : timeSelector.find('.minuteselect option:selected').val());
                    selected.setSeconds(!isNaN(selected.getSeconds()) ? selected.getSeconds() : timeSelector.find('.secondselect option:selected').val());

                    if (!this.timePicker24Hour) {
                        var ampm = timeSelector.find('.ampmselect option:selected').val();
                        if (ampm === 'PM' && selected.getHours() < 12)
                            selected.setHours(selected.getHours() + 12);
                        if (ampm === 'AM' && selected.getHours() === 12)
                            selected.setHours(0);
                    }

                }

                if (selected < this.startDate)
                    selected = new Date(this.startDate);

                if (maxDate && selected > maxDate)
                    selected = new Date(maxDate);

            }

            //
            // hours
            //

            html = '<select class="hourselect">';

            var start = this.timePicker24Hour ? 0 : 1;
            var end = this.timePicker24Hour ? 23 : 12;

            for (var i = start; i <= end; i++) {
                var i_in_24 = i;
                if (!this.timePicker24Hour)
                    i_in_24 = selected.getHours() >= 12 ? (i === 12 ? 12 : i + 12) : (i === 12 ? 0 : i);

                var time = new Date(selected);
                time.setHours(i_in_24);
                var disabled = false;
                if (minDate && time.setMinutes(59) < minDate.getTime())
                    disabled = true;
                if (maxDate && time.setMinutes(0) > maxDate.getTime())
                    disabled = true;

                if (i_in_24 == selected.getHours() && !disabled) {
                    html += '<option value="' + i + '" selected="selected">' + i + '</option>';
                } else if (disabled) {
                    html += '<option value="' + i + '" disabled="disabled" class="disabled">' + i + '</option>';
                } else {
                    html += '<option value="' + i + '">' + i + '</option>';
                }
            }

            html += '</select> ';

            //
            // minutes
            //

            html += ': <select class="minuteselect">';

            for (var i = 0; i < 60; i += this.timePickerIncrement) {
                var padded = i < 10 ? '0' + i : i;
                var time = new Date(selected);
                time.setMinutes(i);

                var disabled = false;
                if (minDate && time.setSeconds(59) < minDate.getTime())
                    disabled = true;
                if (maxDate && time.setSeconds(0) > maxDate.getTime())
                    disabled = true;

                if (selected.getMinutes() === i && !disabled) {
                    html += '<option value="' + i + '" selected="selected">' + padded + '</option>';
                } else if (disabled) {
                    html += '<option value="' + i + '" disabled="disabled" class="disabled">' + padded + '</option>';
                } else {
                    html += '<option value="' + i + '">' + padded + '</option>';
                }
            }

            html += '</select> ';

            //
            // seconds
            //

            if (this.timePickerSeconds) {
                html += ': <select class="secondselect">';

                for (var i = 0; i < 60; i++) {
                    var padded = i < 10 ? '0' + i : i;
                    var time = new Date(selected);
                    time.setSeconds(i);

                    var disabled = false;
                    if (minDate && time < minDate)
                        disabled = true;
                    if (maxDate && time > maxDate)
                        disabled = true;

                    if (selected.getSeconds() === i && !disabled) {
                        html += '<option value="' + i + '" selected="selected">' + padded + '</option>';
                    } else if (disabled) {
                        html += '<option value="' + i + '" disabled="disabled" class="disabled">' + padded + '</option>';
                    } else {
                        html += '<option value="' + i + '">' + padded + '</option>';
                    }
                }

                html += '</select> ';
            }

            //
            // AM/PM
            //

            if (!this.timePicker24Hour) {
                html += '<select class="ampmselect">';

                var am_html = '';
                var pm_html = '';

                if (minDate && new Date(selected).setHours(12, 0, 0) < minDate.getTime())
                    am_html = ' disabled="disabled" class="disabled"';

                if (maxDate && new Date(selected).setHours(0, 0, 0) > maxDate.getTime())
                    pm_html = ' disabled="disabled" class="disabled"';

                if (selected.getHours() >= 12) {
                    html += '<option value="AM"' + am_html + '>AM</option><option value="PM" selected="selected"' + pm_html + '>PM</option>';
                } else {
                    html += '<option value="AM" selected="selected"' + am_html + '>AM</option><option value="PM"' + pm_html + '>PM</option>';
                }

                html += '</select>';
            }

            this.container.find('.drp-calendar.' + side + ' .calendar-time').html(html);

        },

        updateFormInputs: function() {

            if (this.singleDatePicker || (this.endDate && (this.startDate < this.endDate || this.startDate.getTime() === this.endDate.getTime()))) {
                this.container.find('button.applyBtn').prop('disabled', false);
            } else {
                this.container.find('button.applyBtn').prop('disabled', true);
            }

        },

        move: function() {
            var parentOffset = { top: 0, left: 0 },
                containerTop;
            var parentRightEdge = $(window).width();
            if (!this.parentEl.is('body')) {
                parentOffset = {
                    top: this.parentEl.offset().top - this.parentEl.scrollTop(),
                    left: this.parentEl.offset().left - this.parentEl.scrollLeft()
                };
                parentRightEdge = this.parentEl[0].clientWidth + this.parentEl.offset().left;
            }

            if (this.drops == 'up')
                containerTop = this.element.offset().top - this.container.outerHeight() - parentOffset.top;
            else
                containerTop = this.element.offset().top + this.element.outerHeight() - parentOffset.top;

            // Force the container to it's actual width
            this.container.css({
              top: 0,
              left: 0,
              right: 'auto'
            });
            var containerWidth = this.container.outerWidth();

            this.container[this.drops === 'up' ? 'addClass' : 'removeClass']('drop-up');

            if (this.opens === 'left') {
                var containerRight = parentRightEdge - this.element.offset().left - this.element.outerWidth();
                if (containerWidth + containerRight > $(window).width()) {
                    this.container.css({
                        top: containerTop,
                        right: 'auto',
                        left: 9
                    });
                } else {
                    this.container.css({
                        top: containerTop,
                        right: containerRight,
                        left: 'auto'
                    });
                }
            } else if (this.opens === 'center') {
                var containerLeft = this.element.offset().left - parentOffset.left + this.element.outerWidth() / 2
                                        - containerWidth / 2;
                if (containerLeft < 0) {
                    this.container.css({
                        top: containerTop,
                        right: 'auto',
                        left: 9
                    });
                } else if (containerLeft + containerWidth > $(window).width()) {
                    this.container.css({
                        top: containerTop,
                        left: 'auto',
                        right: 0
                    });
                } else {
                    this.container.css({
                        top: containerTop,
                        left: containerLeft,
                        right: 'auto'
                    });
                }
            } else {
                var containerLeft = this.element.offset().left - parentOffset.left;
                if (containerLeft + containerWidth > $(window).width()) {
                    this.container.css({
                        top: containerTop,
                        left: 'auto',
                        right: 0
                    });
                } else {
                    this.container.css({
                        top: containerTop,
                        left: containerLeft,
                        right: 'auto'
                    });
                }
            }
        },

        show: function(e) {
            if (this.isShowing) return;

            // Create a click proxy that is private to this instance of datepicker, for unbinding
            this._outsideClickProxy = $.proxy(function(e) { this.outsideClick(e); }, this);

            // Bind global datepicker mousedown for hiding and
            $(document)
              .on('mousedown.daterangepicker', this._outsideClickProxy)
              // also support mobile devices
              .on('touchend.daterangepicker', this._outsideClickProxy)
              // also explicitly play nice with Bootstrap dropdowns, which stopPropagation when clicking them
              .on('click.daterangepicker', '[data-toggle=dropdown]', this._outsideClickProxy)
              // and also close when focus changes to outside the picker (eg. tabbing between controls)
              .on('focusin.daterangepicker', this._outsideClickProxy);

            // Reposition the picker if the window is resized while it's open
            $(window).on('resize.daterangepicker', $.proxy(function(e) { this.move(e); }, this));

            this.oldStartDate = new Date(this.startDate);
            this.oldEndDate = new Date(this.endDate);
            this.previousRightTime = new Date(this.endDate);

            this.updateView();
            this.container.show();
            this.move();
            this.element.trigger('show.daterangepicker', this);
            this.isShowing = true;
        },

        hide: function(e) {
            if (!this.isShowing) return;

            //incomplete date selection, revert to last values
            if (!this.endDate) {
                this.startDate = new Date(this.oldStartDate);
                this.endDate = new Date(this.oldEndDate);
            }

            //if a new date range was selected, invoke the user callback function
            if (this.startDate.getTime() !== this.oldStartDate.getTime() || this.endDate.getTime() !== this.oldEndDate.getTime())
                this.callback(new Date(this.startDate), new Date(this.endDate), this.chosenLabel);

            //if picker is attached to a text input, update it
            this.updateElement();

            $(document).off('.daterangepicker');
            $(window).off('.daterangepicker');
            this.container.hide();
            this.element.trigger('hide.daterangepicker', this);
            this.isShowing = false;
        },

        toggle: function(e) {
            if (this.isShowing) {
                this.hide();
            } else {
                this.show();
            }
        },

        outsideClick: function(e) {
            var target = $(e.target);
            // if the page is clicked anywhere except within the daterangerpicker/button
            // itself then call this.hide()
            if (
                // ie modal dialog fix
                e.type == "focusin" ||
                target.closest(this.element).length ||
                target.closest(this.container).length ||
                target.closest('.calendar-table').length
                ) return;
            this.hide();
            this.element.trigger('outsideClick.daterangepicker', this);
        },

        showCalendars: function() {
            this.container.addClass('show-calendar');
            this.move();
            this.element.trigger('showCalendar.daterangepicker', this);
        },

        hideCalendars: function() {
            this.container.removeClass('show-calendar');
            this.element.trigger('hideCalendar.daterangepicker', this);
        },

        clickRange: function(e) {
            var label = e.target.getAttribute('data-range-key');
            this.chosenLabel = label;
            if (label == this.locale.customRangeLabel) {
                this.showCalendars();
            } else {
                var dates = this.ranges[label];
                this.startDate = dates[0];
                this.endDate = dates[1];

                if (!this.timePicker) {
                    this.startDate.startOf('day');
                    this.endDate.endOf('day');
                }

                if (!this.alwaysShowCalendars)
                    this.hideCalendars();
                this.clickApply();
            }
        },

        clickPrev: function(e) {
            var cal = $(e.target).parents('.drp-calendar');
            if (cal.hasClass('left')) {
                this.leftCalendar.month.setMonth(this.leftCalendar.month.getMonth() - 1);
                if (this.linkedCalendars)
                    this.rightCalendar.month.setMonth(this.rightCalendar.month.getMonth() - 1);
            } else {
                this.rightCalendar.month.setMonth(this.rightCalendar.month.getMonth() - 1);
            }
            this.updateCalendars();
        },

        clickNext: function(e) {
            var cal = $(e.target).parents('.drp-calendar');
            if (cal.hasClass('left')) {
                this.leftCalendar.month.setMonth(this.leftCalendar.month.getMonth() + 1);
            } else {
                this.rightCalendar.month.setMonth(this.rightCalendar.month.getMonth() + 1);
                if (this.linkedCalendars)
                    this.leftCalendar.month.setMonth(this.leftCalendar.month.getMonth() + 1);
            }
            this.updateCalendars();
        },

        hoverDate: function(e) {

            //ignore dates that can't be selected
            if (!$(e.target).hasClass('available')) return;

            var title = $(e.target).attr('data-title');
            var row = title.substr(1, 1);
            var col = title.substr(3, 1);
            var cal = $(e.target).parents('.drp-calendar');
            var date = cal.hasClass('left') ? this.leftCalendar.calendar[row][col] : this.rightCalendar.calendar[row][col];

            //highlight the dates between the start date and the date being hovered as a potential end date
            var leftCalendar = this.leftCalendar;
            var rightCalendar = this.rightCalendar;
            var startDate = this.startDate;
            if (!this.endDate) {
                this.container.find('.drp-calendar tbody td').each(function(index, el) {

                    //skip week numbers, only look at dates
                    if ($(el).hasClass('week')) return;

                    var title = $(el).attr('data-title');
                    var row = title.substr(1, 1);
                    var col = title.substr(3, 1);
                    var cal = $(el).parents('.drp-calendar');
                    var dt = cal.hasClass('left') ? leftCalendar.calendar[row][col] : rightCalendar.calendar[row][col];

                    if ((dt > startDate && dt < date) || new Date(dt).setHours(0, 0, 0, 0) === new Date(date).setHours(0, 0, 0, 0)) {
                        $(el).addClass('in-range');
                    } else {
                        $(el).removeClass('in-range');
                    }

                });
            }

        },

        clickDate: function(e) {

            if (!$(e.target).hasClass('available')) return;

            var title = $(e.target).attr('data-title');
            var row = title.substr(1, 1);
            var col = title.substr(3, 1);
            var cal = $(e.target).parents('.drp-calendar');
            var date = cal.hasClass('left') ? this.leftCalendar.calendar[row][col] : this.rightCalendar.calendar[row][col];

            //
            // this function needs to do a few things:
            // * alternate between selecting a start and end date for the range,
            // * if the time picker is enabled, apply the hour/minute/second from the select boxes to the clicked date
            // * if autoapply is enabled, and an end date was chosen, apply the selection
            // * if single date picker mode, and time picker isn't enabled, apply the selection immediately
            // * if one of the inputs above the calendars was focused, cancel that manual input
            //

            if (this.endDate || checkBefore(date, this.startDate, 'day')) { //picking start
                if (this.timePicker) {
                    var hour = parseInt(this.container.find('.left .hourselect').val(), 10);
                    if (!this.timePicker24Hour) {
                        var ampm = this.container.find('.left .ampmselect').val();
                        if (ampm === 'PM' && hour < 12)
                            hour += 12;
                        if (ampm === 'AM' && hour === 12)
                            hour = 0;
                    }
                    var minute = parseInt(this.container.find('.left .minuteselect').val(), 10);
                    if (isNaN(minute)) {
                        minute = parseInt(this.container.find('.left .minuteselect option:last').val(), 10);
                    }
                    var second = this.timePickerSeconds ? parseInt(this.container.find('.left .secondselect').val(), 10) : 0;
                    date = new Date(date);
                    date.setHours(hour, minute, second)
                }
                this.endDate = null;
                this.setStartDate(new Date(date));
            } else if (!this.endDate && date < this.startDate) {
                //special case: clicking the same date for start/end,
                //but the time of the end date is before the start date
                this.setEndDate(new Date(this.startDate));
            } else { // picking end
                if (this.timePicker) {
                    var hour = parseInt(this.container.find('.right .hourselect').val(), 10);
                    if (!this.timePicker24Hour) {
                        var ampm = this.container.find('.right .ampmselect').val();
                        if (ampm === 'PM' && hour < 12)
                            hour += 12;
                        if (ampm === 'AM' && hour === 12)
                            hour = 0;
                    }
                    var minute = parseInt(this.container.find('.right .minuteselect').val(), 10);
                    if (isNaN(minute)) {
                        minute = parseInt(this.container.find('.right .minuteselect option:last').val(), 10);
                    }
                    var second = this.timePickerSeconds ? parseInt(this.container.find('.right .secondselect').val(), 10) : 0;
                    date = new Date(date);
                    date.setHours(hour, minute, second)
                }
                this.setEndDate(new Date(date));
                if (this.autoApply) {
                  this.calculateChosenLabel();
                  this.clickApply();
                }
            }

            if (this.singleDatePicker) {
                this.setEndDate(this.startDate);
                if (!this.timePicker)
                    this.clickApply();
            }

            this.updateView();

            //This is to cancel the blur event handler if the mouse was in one of the inputs
            e.stopPropagation();

        },

        calculateChosenLabel: function () {
            var customRange = true;
            var i = 0;
            for (var range in this.ranges) {
              if (this.timePicker) {
                    var format = this.timePickerSeconds ? this.locale.formatSecond : this.locale.formatMinute;
                    //ignore times when comparing dates if time picker seconds is not enabled
                    if (format(this.startDate) === format(this.ranges[range][0]) && format(this.endDate) === format(this.ranges[range][1])) {
                        customRange = false;
                        this.chosenLabel = this.container.find('.ranges li:eq(' + i + ')').addClass('active').attr('data-range-key');
                        break;
                    }
                } else {
                    //ignore times when comparing dates if time picker is not enabled
                    if (this.locale.formatDate(this.startDate) === this.locale.formatDate(this.ranges[range][0]) && this.locale.formatDate(this.endDate) === this.locale.formatDate(this.ranges[range][1])) {
                        customRange = false;
                        this.chosenLabel = this.container.find('.ranges li:eq(' + i + ')').addClass('active').attr('data-range-key');
                        break;
                    }
                }
                i++;
            }
            if (customRange) {
                if (this.showCustomRangeLabel) {
                    this.chosenLabel = this.container.find('.ranges li:last').addClass('active').attr('data-range-key');
                } else {
                    this.chosenLabel = null;
                }
                this.showCalendars();
            }
        },

        clickApply: function(e) {
            this.hide();
            this.element.trigger('apply.daterangepicker', this);
        },

        clickCancel: function(e) {
            this.startDate = this.oldStartDate;
            this.endDate = this.oldEndDate;
            this.hide();
            this.element.trigger('cancel.daterangepicker', this);
        },

        monthOrYearChanged: function(e) {
            var isLeft = $(e.target).closest('.drp-calendar').hasClass('left'),
                leftOrRight = isLeft ? 'left' : 'right',
                cal = this.container.find('.drp-calendar.'+leftOrRight);

            // Month must be Number for new moment versions
            var month = parseInt(cal.find('.monthselect').val(), 10);
            var year = cal.find('.yearselect').val();

            if (!isLeft) {
                if (year < this.startDate.getFullYear() || (year === this.startDate.getFullYear() && month < this.startDate.getMonth())) {
                    month = this.startDate.getMonth();
                    year = this.startDate.getFullYear();
                }
            }

            if (this.minDate) {
                if (year < this.minDate.getFullYear() || (year === this.minDate.getFullYear() && month < this.minDate.getMonth())) {
                    month = this.minDate.getMonth();
                    year = this.minDate.getFullYear();
                }
            }

            if (this.maxDate) {
                if (year > this.maxDate.getFullYear() || (year === this.maxDate.getFullYear() && month > this.maxDate.getMonth())) {
                    month = this.maxDate.getMonth();
                    year = this.maxDate.getFullYear();
                }
            }

            if (isLeft) {
                this.leftCalendar.month.setFullYear(year, month);
                if (this.linkedCalendars) {
                    this.rightCalendar.month = new Date(this.leftCalendar.month);
                    this.rightCalendar.month.setMonth(this.rightCalendar.month.getMonth() + 1);
                }
            } else {
                this.rightCalendar.month.setFullYear(year, month);
                if (this.linkedCalendars) {
                    this.leftCalendar.month = new Date(this.leftCalendar.month);
                    this.leftCalendar.month.setMonth(this.leftCalendar.month.getMonth() - 1);
                }
            }
            this.updateCalendars();
        },

        timeChanged: function(e) {

            var cal = $(e.target).closest('.drp-calendar'),
                isLeft = cal.hasClass('left');

            var hour = parseInt(cal.find('.hourselect').val(), 10);
            var minute = parseInt(cal.find('.minuteselect').val(), 10);
            if (isNaN(minute)) {
                minute = parseInt(cal.find('.minuteselect option:last').val(), 10);
            }
            var second = this.timePickerSeconds ? parseInt(cal.find('.secondselect').val(), 10) : 0;

            if (!this.timePicker24Hour) {
                var ampm = cal.find('.ampmselect').val();
                if (ampm === 'PM' && hour < 12)
                    hour += 12;
                if (ampm === 'AM' && hour === 12)
                    hour = 0;
            }

            if (isLeft) {
                var start = new Date(this.startDate);
                start.setHours(hour, minute, second)
                this.setStartDate(start);
                if (this.singleDatePicker) {
                    this.endDate = new Date(this.startDate);
                } else if (this.endDate && this.locale.formatDate(this.endDate) == this.locale.formatDate(start) && this.endDate < start) {
                    this.setEndDate(new Date(start));
                }
            } else if (this.endDate) {
                var end = new Date(this.endDate);
                end.setHours(hour, minute, second)
                this.setEndDate(end);
            }

            //update the calendars so all clickable dates reflect the new time component
            this.updateCalendars();

            //update the form inputs above the calendars with the new time
            this.updateFormInputs();

            //re-render the time pickers because changing one selection can affect what's enabled in another
            this.renderTimePicker('left');
            this.renderTimePicker('right');

        },

        elementChanged: function() {
            if (!this.element.is('input')) return;
            if (!this.element.val().length) return;

            var dateString = this.element.val().split(this.locale.separator),
                start = null,
                end = null;

            if (dateString.length === 2) {
                start = new Date(dateString[0]);
                end = new Date(dateString[1]);
            }

            if (this.singleDatePicker || start === null || end === null) {
                start = new Date(this.element.val());
                end = start;
            }

            if (!start.isValid() || !end.isValid()) return;

            this.setStartDate(start);
            this.setEndDate(end);
            this.updateView();
        },

        keydown: function(e) {
            //hide on tab or enter
            if ((e.keyCode === 9) || (e.keyCode === 13)) {
                this.hide();
            }

            //hide on esc and prevent propagation
            if (e.keyCode === 27) {
                e.preventDefault();
                e.stopPropagation();

                this.hide();
            }
        },

        updateElement: function() {
            if (this.element.is('input') && this.autoUpdateInput) {
                var newValue = this.locale.format(this.startDate);
                if (!this.singleDatePicker) {
                    newValue += this.locale.separator + this.locale.format(this.endDate);
                }
                if (newValue !== this.element.val()) {
                    this.element.val(newValue).trigger('change');
                }
            }
        },

        remove: function() {
            this.container.remove();
            this.element.off('.daterangepicker');
            this.element.removeData();
        }

    };

    $.fn.daterangepicker = function(options, callback) {
        var implementOptions = $.extend(true, {}, $.fn.daterangepicker.defaultOptions, options);
        this.each(function() {
            var el = $(this);
            if (el.data('daterangepicker'))
                el.data('daterangepicker').remove();
            el.data('daterangepicker', new DateRangePicker(el, implementOptions, callback));
        });
        return this;
    };

    return DateRangePicker;

}));
