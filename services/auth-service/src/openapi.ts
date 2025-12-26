/**
 * @swagger
 * components:
 *   schemas:
 *     CustomerRegistration:
 *       type: object
 *       required:
 *         - email
 *         - password
 *         - firstName
 *         - lastName
 *         - phone
 *       properties:
 *         email:
 *           type: string
 *           format: email
 *           example: customer@example.com
 *         password:
 *           type: string
 *           format: password
 *           minLength: 8
 *           example: SecurePass123!
 *         firstName:
 *           type: string
 *           example: John
 *         lastName:
 *           type: string
 *           example: Doe
 *         phone:
 *           type: string
 *           example: '+1234567890'
 *         address:
 *           type: object
 *           properties:
 *             street:
 *               type: string
 *             city:
 *               type: string
 *             state:
 *               type: string
 *             zipCode:
 *               type: string
 *             country:
 *               type: string
 *
 *     RestaurantRegistration:
 *       type: object
 *       required:
 *         - email
 *         - password
 *         - restaurantName
 *         - ownerName
 *       properties:
 *         email:
 *           type: string
 *           format: email
 *         password:
 *           type: string
 *           format: password
 *           minLength: 8
 *         restaurantName:
 *           type: string
 *         ownerName:
 *           type: string
 *         cuisineType:
 *           type: string
 *         address:
 *           type: object
 *           properties:
 *             street:
 *               type: string
 *             city:
 *               type: string
 *             state:
 *               type: string
 *             zipCode:
 *               type: string
 *             country:
 *               type: string
 *
 *     DeliveryPartnerRegistration:
 *       type: object
 *       required:
 *         - email
 *         - password
 *         - firstName
 *         - lastName
 *         - vehicleType
 *       properties:
 *         email:
 *           type: string
 *           format: email
 *         password:
 *           type: string
 *           format: password
 *           minLength: 8
 *         firstName:
 *           type: string
 *         lastName:
 *           type: string
 *         phone:
 *           type: string
 *         vehicleType:
 *           type: string
 *           enum:
 *             - bike
 *             - scooter
 *             - car
 *
 *     LoginRequest:
 *       type: object
 *       required:
 *         - email
 *         - password
 *       properties:
 *         email:
 *           type: string
 *           format: email
 *         password:
 *           type: string
 *           format: password
 *
 *     TokenResponse:
 *       type: object
 *       properties:
 *         success:
 *           type: boolean
 *           example: true
 *         data:
 *           type: object
 *           properties:
 *             accessToken:
 *               type: string
 *               description: JWT access token (short-lived, in memory)
 *             userId:
 *               type: string
 *             userType:
 *               type: string
 *               enum:
 *                 - customer
 *                 - restaurant_owner
 *                 - delivery_partner
 *             expiresIn:
 *               type: number
 *               description: Access token expiry in seconds
 *
 *     RegistrationResponse:
 *       type: object
 *       properties:
 *         success:
 *           type: boolean
 *           example: true
 *         data:
 *           type: object
 *           properties:
 *             userId:
 *               type: string
 *             email:
 *               type: string
 *             userType:
 *               type: string
 *               enum:
 *                 - customer
 *                 - restaurant_owner
 *                 - delivery_partner
 *             step:
 *               type: number
 *               description: Completed registration step
 *
 * /auth/health:\n *   get:\n *     summary: Health check endpoint\n *     tags:\n *       - Health\n *     responses:\n *       '200':\n *         description: Service is healthy\n *         content:\n *           application/json:\n *             schema:\n *               type: object\n *               properties:\n *                 status:\n *                   type: string\n *                   example: healthy\n *                 service:\n *                   type: string\n *                   example: auth-service\n *                 timestamp:\n *                   type: string\n *                   format: date-time\n *\n * /auth/customer/register:\n *   post:\n *     summary: Register a new customer\n *     tags:\n *       - Customer Authentication\n *     requestBody:\n *       required: true\n *       content:\n *         application/json:\n *           schema:\n *             $ref: '#/components/schemas/CustomerRegistration'\n *     responses:\n *       '201':\n *         description: Customer registration successful\n *         content:\n *           application/json:\n *             schema:\n *               $ref: '#/components/schemas/RegistrationResponse'\n *       '400':\n *         description: Validation error\n *         content:\n *           application/json:\n *             schema:\n *               $ref: '#/components/schemas/ValidationError'\n *       '409':\n *         description: Email already registered\n *         content:\n *           application/json:\n *             schema:\n *               $ref: '#/components/schemas/Error'\n *\n * /auth/restaurant/register:\n *   post:\n *     summary: Register a new restaurant owner\n *     tags:\n *       - Restaurant Authentication\n *     requestBody:\n *       required: true\n *       content:\n *         application/json:\n *           schema:\n *             $ref: '#/components/schemas/RestaurantRegistration'\n *     responses:\n *       '201':\n *         description: Restaurant registration successful\n *         content:\n *           application/json:\n *             schema:\n *               $ref: '#/components/schemas/RegistrationResponse'\n *       '400':\n *         description: Validation error\n *       '409':\n *         description: Email already registered\n *\n * /auth/delivery/register:\n *   post:\n *     summary: Register a new delivery partner\n *     tags:\n *       - Delivery Partner Authentication\n *     requestBody:\n *       required: true\n *       content:\n *         application/json:\n *           schema:\n *             $ref: '#/components/schemas/DeliveryPartnerRegistration'\n *     responses:\n *       '201':\n *         description: Delivery partner registration successful\n *         content:\n *           application/json:\n *             schema:\n *               $ref: '#/components/schemas/RegistrationResponse'\n *       '400':\n *         description: Validation error\n *       '409':\n *         description: Email already registered\n *\n * /auth/login:\n *   post:\n *     summary: Login user and get access token\n *     tags:\n *       - Authentication\n *     requestBody:\n *       required: true\n *       content:\n *         application/json:\n *           schema:\n *             $ref: '#/components/schemas/LoginRequest'\n *     responses:\n *       '200':\n *         description: Login successful\n *         content:\n *           application/json:\n *             schema:\n *               $ref: '#/components/schemas/TokenResponse'\n *       '400':\n *         description: Validation error\n *       '401':\n *         description: Invalid credentials\n *       '423':\n *         description: Account locked due to too many failed attempts\n *\n * /auth/refresh:\n *   post:\n *     summary: Refresh access token using refresh token from cookie\n *     tags:\n *       - Authentication\n *     responses:\n *       '200':\n *         description: New access token generated\n *         content:\n *           application/json:\n *             schema:\n *               $ref: '#/components/schemas/TokenResponse'\n *       '401':\n *         description: No valid refresh token\n *       '403':\n *         description: Refresh token expired or invalid\n *\n * /auth/logout:\n *   post:\n *     summary: Logout user from current device\n *     tags:\n *       - Authentication\n *     security:\n *       - bearerAuth: []\n *     responses:\n *       '200':\n *         description: Logout successful\n *       '401':\n *         description: Unauthorized\n *\n * /auth/logout/all:\n *   post:\n *     summary: Logout user from all devices\n *     tags:\n *       - Authentication\n *     security:\n *       - bearerAuth: []\n *     responses:\n *       '200':\n *         description: Logged out from all devices\n *       '401':\n *         description: Unauthorized\n */\n\nexport {};\n