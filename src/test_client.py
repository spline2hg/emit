import log_client
import logging

logger = logging.getLogger(__name__)
logger.setLevel(logging.INFO)
log_client.init(level=logging.INFO,api_key="inS0nUmqFeKS9KzEQWZwtUZu2Pl8VmH7l3pYU3MC7SU:54d15e6e-90d5-446f-9427-6423d38e4b3e")


# logger.debug('This debug message will NOT be captured (below INFO level)')
# logger.info('User logged in with value')
# logger.warning('This is a warning - captured!')
logger.error('Something went wrong - captured!')

# logger.debug('This debug message will NOT be captured (below INFO level)')
# logger.info('User logged in with value')
# logger.warning('This is a warning - captured!')
logger.error('Something went wrong - captured!')