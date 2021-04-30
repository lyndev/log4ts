# 1 log4ts
typescript log4ts

# 2 import
import { logger4 } from "../../libs/log4/log4ts";

# 3 use
```
    export GameLogger = new logger4.Logger("test-log")
    let layout = new logger4.BasicLayout();
    let appender = new logger4.ConsoleAppender();
    appender.setLayout(layout);
    let config = new logger4.LoggerConfig(appender, logger4.LogLevel.ALL);
    logger4.Logger.setConfig(config);

    GameLogger.error("this is a test error");
    GameLogger.warn("this is a testwarn");
    GameLogger.log("this is a testlog");
    GameLogger.info("this is a testinfo");
    GameLogger.debug("this is a testdebug");
    GameLogger.fatal("this is a testfatal");
    GameLogger.trace("this is a testtrace");
```
