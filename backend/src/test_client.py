import log_client
import logging

logger = logging.getLogger(__name__)
logger.setLevel(logging.INFO)
log_client.init(level=logging.INFO,api_key="your_api_key")


# logger.debug('This debug message will NOT be captured (below INFO level)')
# logger.info('User logged in with value')
# logger.warning('This is a warning - captured!')
logger.error('Something went wrong - captured!')

# logger.debug('This debug message will NOT be captured (below INFO level)')
# logger.info('User logged in with value')
# logger.warning('This is a warning - captured!')
logger.error('Something went wrong - captured!')