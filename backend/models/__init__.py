from flask_sqlalchemy import SQLAlchemy

db = SQLAlchemy()

# Import models so db.create_all() can discover them
from .user import User
from .customer import Customer
from .policy import Policy
from .claim import Claim
from .premium_payment import PremiumPayment
from .document import Document
from .notification import Notification
