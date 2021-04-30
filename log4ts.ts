export module logger4 {
    export enum LogLevel {
        ALL = 0,
        TRACE = 1,
        DEBUG = 2,
        INFO = 3,
        WARN = 4,
        ERROR = 5,
        FATAL = 6,
        OFF = 7
    }

    export let LogColor = {
        [LogLevel.TRACE]: "#2eb596",
        [LogLevel.DEBUG]: "#3f79e8",
        [LogLevel.INFO]: "#00ff00",
        [LogLevel.WARN]: "#bee22b",
        [LogLevel.FATAL]: "#ff56d9",
        [LogLevel.ERROR]: "#ff0000",
    }

    export class BaseAppender {
        setLayout(layout: ILayout) {
            this.layout = layout;
        }
        setLayoutFunction(layout: ILayoutFunction) {
            this.layout = {
                format: layout
            }
        }

        protected layout: ILayout;
    }

    export class ConsoleAppender extends BaseAppender implements IAppender {
        constructor(private console?: Console) {
            super();
        }

        append(entry: LogEntry) {
            this.getConsole().log('%c' + this.layout.format(entry), 'color:' + LogColor[entry.level]);
        }

        clear() {
            this.getConsole().clear();
        }

        private getConsole(): Console {
            return this.console || console;
        }
    }


    /**
     * Simple layout, that formats logs as
     * "{time} {level} [{tag}] - {message}"
     */
    export class BasicLayout implements ILayout {
        format(entry: LogEntry): string {
            return this.formatDate(entry.time) + ' ' + logLevelToString(entry.level) + ' [' + entry.tag + '] - ' + entry.message;
        }

        private formatDate(date: Date): string {
            function pad(number) {
                if (number < 10) {
                    return '0' + number;
                }
                return number;
            }

            return date.getFullYear() +
                '-' + pad(date.getMonth() + 1) +
                '-' + pad(date.getDate()) +
                ' ' + pad(date.getHours()) +
                ':' + pad(date.getMinutes()) +
                ':' + pad(date.getSeconds());
        }
    }

    export interface HTMLLayoutColors {
        tag: string;
        message: string;
        time: string;
        level: string;
    }

    export enum HTMLLayoutColorTheme {
        LIGHT,
        DARK,
        SOLARIZED
    }

    export class HTMLLayout implements ILayout {
        constructor(colors_theme?: HTMLLayoutColorTheme | HTMLLayoutColors) {
            if (colors_theme === HTMLLayoutColorTheme.LIGHT) {
                this.colors = {
                    time: 'black',
                    level: 'dark red',
                    tag: 'dark green',
                    message: 'black'
                }
            } else if (colors_theme === HTMLLayoutColorTheme.DARK) {
                this.colors = {
                    time: 'white',
                    level: 'red',
                    tag: 'green',
                    message: 'white'
                };
            } else if (colors_theme === HTMLLayoutColorTheme.SOLARIZED) {
                this.colors = {
                    time: '#839496',
                    level: '#dc322f',
                    tag: '#859900',
                    message: '#839496'
                };
            } else {
                this.colors = <HTMLLayoutColors>colors_theme;
            }
        }
        format(entry: LogEntry): string {
            return '<span' + this.getTimeStyle() + '>' + this.formatDate(entry.time) + '</span> ' +
                '<span' + this.getLevelStyle() + '>' + LogLevel[entry.level] + '</span> ' +
                '<span' + this.getTagStyle() + '>[' + entry.tag + ']</span> ' +
                '<span' + this.getMessageStyle() + '>' + entry.message + '</span>';
        }

        private getTimeStyle() {
            if (!this.colors) {
                return '';
            }
            return this.getStyle(this.colors.time);
        }
        private getLevelStyle() {
            if (!this.colors) {
                return '';
            }
            return this.getStyle(this.colors.level);
        }
        private getTagStyle() {
            if (!this.colors) {
                return '';
            }
            return this.getStyle(this.colors.tag);
        }
        private getMessageStyle() {
            if (!this.colors) {
                return '';
            }
            return this.getStyle(this.colors.message);
        }

        private getStyle(color: string): string {
            return ' style="color: ' + color + '"';
        }

        private formatDate(date: Date): string {
            function pad(number) {
                if (number < 10) {
                    return '0' + number;
                }
                return number;
            }

            return date.getFullYear() +
                '-' + pad(date.getMonth() + 1) +
                '-' + pad(date.getDate()) +
                ' ' + pad(date.getHours()) +
                ':' + pad(date.getMinutes()) +
                ':' + pad(date.getSeconds());
        }

        private colors: HTMLLayoutColors;
    }
    export interface IAppender {
        setLayout(layout: ILayout);
        setLayoutFunction(layout: ILayoutFunction);
        append(entry: LogEntry);
        clear();
    }


    export interface ILayout {
        format(entry: LogEntry): string;
    }

    export interface ILayoutFunction {
        (entry: LogEntry): string;
    }


    export interface LogEntry {
        level: LogLevel;
        time: Date;
        message: string;
        tag: string;
    }


    export class LoggerConfig {
        constructor(appender?: IAppender, private level: LogLevel = LogLevel.INFO, private tags?: string[]) {
            if (appender) {
                this.addAppender(appender);
            }
        }
        public addAppender(appender: IAppender) {
            this.appenders.push(appender);
        }

        public setLevel(level: LogLevel) {
            this.level = level;
        }

        public getAppenders() {
            return this.appenders;
        }

        public getLevel() {
            return this.level;
        }

        public hasTag(tag: string) {
            if (!this.tags || this.tags.length === 0) return true;

            for (let i in this.tags) {
                let t = this.tags[i];
                if (t === tag) {
                    return true;
                }
            }

            return false;
        }

        private appenders: IAppender[] = [];

        public static createFromJson(json: ConfigJson): LoggerConfig {
            let config = new LoggerConfig(null, LogLevel[json.level], json.tags);
            for (let layout_json of json.layouts) {
                let layout: ILayout;

                switch (layout_json.type) {
                    case "basic":
                        layout = new BasicLayout();
                        break;
                    case "html":
                        let color_scheme = layout_json.options && layout_json.options.color_scheme;
                        let colors;
                        if (typeof color_scheme === "string") {
                            colors = HTMLLayoutColorTheme[color_scheme as string];
                        } else {
                            colors = color_scheme as HTMLLayoutColors;
                        }
                        layout = new HTMLLayout(colors);
                        break;
                }

                for (let appender_json of layout_json.appenders) {
                    let appender: IAppender;

                    switch (appender_json.type) {
                        case "console":
                            appender = new ConsoleAppender();
                            break;
                        case "dom":
                            // let options = appender_json.options as ConfigJsonDomAppenderOptions;
                            //appender = new DOMAppender(options.container_id, options.escape_html, options.buffer_size);
                            break;

                    }

                    appender.setLayout(layout);

                    config.addAppender(appender);
                }
            }

            return config;
        }
    }

    export class Logger {
        constructor(private tag?: string) {

        }
        public log(message: string, object?: any, deep?: number) {
            this.doLog(LogLevel.INFO, message, object, deep);
        }
        public info(message: string, object?: any, deep?: number) {
            this.doLog(LogLevel.INFO, message, object, deep);
        }
        public fatal(message: string, object?: any, deep?: number) {
            this.doLog(LogLevel.FATAL, message, object, deep);
        }
        public error(message: string, object?: any, deep?: number) {
            this.doLog(LogLevel.ERROR, message, object, deep);
        }
        public debug(message: string, object?: any, deep?: number) {
            this.doLog(LogLevel.DEBUG, message, object, deep);
        }
        public warn(message: string, object?: any, deep?: number) {
            this.doLog(LogLevel.WARN, message, object, deep);
        }
        public trace(message: string, object?: any, deep?: number) {
            this.doLog(LogLevel.TRACE, message, object, deep);
        }

        public static setConfig(config: LoggerConfig) {
            Logger.config = config;
        }

        public static getLogger(tag?: string) {
            if (!tag) {
                return Logger.getLogger('undefined');
            }
            if (Logger.loggers[tag]) {
                return Logger.loggers[tag];
            } else {
                return Logger.loggers[tag] = new Logger(tag);
            }
        }

        private static loggers: { [tag: string]: Logger } = {};

        private doLog(level: LogLevel, message: string, object?: any, deep?: number) {
            if (level >= Logger.config.getLevel() && Logger.config.hasTag(this.tag)) {
                if (typeof object !== "undefined") {
                    message += ' ' + stringify(object, deep || 1);
                }
                for (var i in Logger.config.getAppenders()) {
                    var appender = Logger.config.getAppenders()[i];
                    appender.append({
                        message: message,
                        time: new Date(),
                        tag: this.tag,
                        level: level
                    });
                }
            }
        }

        private static config: LoggerConfig = new LoggerConfig();
    }


    export interface ConfigJson {
        layouts: ConfigJsonLayout[];
        level: "ALL" | "TRACE" | "DEBUG" | "INFO" | "WARN" | "ERROR" | "FATAL" | "OFF";
        tags: string[];
    }

    export interface ConfigJsonLayout {
        type: "basic" | "html";
        appenders: ConfigJsonAppender[];
        options?: ConfigHtmlLayoutOptions;
    }

    export interface ConfigHtmlLayoutOptions {
        color_scheme?: "LIGHT" | "DARK" | "SOLARIZED" | HTMLLayoutColors;
    }

    export interface ConfigJsonAppender {
        type: "console" | "dom";
        options?: ConfigJsonDomAppenderOptions;
    }

    export interface ConfigJsonDomAppenderOptions {
        container_id: string;
        escape_html?: boolean;
        buffer_size?: number;
    }


    export function logLevelToString(level: LogLevel): string {
        return LogLevel[level];
    }

    var entityMap = {
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': '&quot;',
        "'": '&#39;',
        "/": '&#x2F;'
    };

    export function escapeHtml(string: string) {
        return string.replace(/[&<>"'\/]/g, function (s) {
            return entityMap[s];
        });
    }

    export function stringify(object: any, deep: number): string {
        function cut(obj, deep) {
            if (deep === 0) return undefined;
            var result = {};
            for (var key in obj) {
                if (obj.hasOwnProperty(key)) {
                    if (typeof obj[key] === 'object') {
                        var cutted = cut(obj[key], deep - 1);
                        if (typeof cutted !== undefined) {
                            result[key] = cutted;
                        }
                    } else {
                        result[key] = obj[key];
                    }
                }
            }
            return result;
        }

        return JSON.stringify(cut(object, deep), null, 2);
    }
}