/**
 * @swagger
 * /health:
 *   get:
 *     summary: Gateway health check
 *     tags:
 *       - Health
 *     responses:
 *       '200':
 *         description: Gateway is healthy
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: healthy
 *                 service:
 *                   type: string
 *                   example: api-gateway
 *                 timestamp:
 *                   type: string
 *                   format: date-time\n *\n * /stats/circuit-breakers:\n *   get:\n *     summary: Get circuit breaker statistics\n *     tags:\n *       - Monitoring\n *     responses:\n *       '200':\n *         description: Circuit breaker stats\n *         content:\n *           application/json:\n *             schema:\n *               type: object\n *               properties:\n *                 circuitBreakers:\n *                   type: array\n *                   items:\n *                     type: object\n *                     properties:\n *                       service:\n *                         type: string\n *                       state:\n *                         type: string\n *                         enum:\n *                           - CLOSED\n *                           - OPEN\n *                           - HALF_OPEN\n *                       failureCount:\n *                         type: number\n *                       successCount:\n *                         type: number\n *                       lastFailureTime:\n *                         type: string\n *                         format: date-time\n *\n * /auth:\n *   get:\n *     summary: Proxy to auth service\n *     tags:\n *       - Auth Routes\n *     responses:\n *       '200':\n *         description: Response from auth service\n *   post:\n *     summary: Proxy POST requests to auth service\n *     tags:\n *       - Auth Routes\n *     responses:\n *       '200':\n *         description: Response from auth service\n *\n * /orders:\n *   get:\n *     summary: Proxy to order service\n *     tags:\n *       - Order Routes\n *     responses:\n *       '200':\n *         description: Response from order service\n *   post:\n *     summary: Proxy POST requests to order service\n *     tags:\n *       - Order Routes\n *     responses:\n *       '200':\n *         description: Response from order service\n *\n * /restaurants:\n *   get:\n *     summary: Proxy to restaurant service\n *     tags:\n *       - Restaurant Routes\n *     responses:\n *       '200':\n *         description: Response from restaurant service\n *   post:\n *     summary: Proxy POST requests to restaurant service\n *     tags:\n *       - Restaurant Routes\n *     responses:\n *       '200':\n *         description: Response from restaurant service\n *\n * /delivery:\n *   get:\n *     summary: Proxy to delivery service\n *     tags:\n *       - Delivery Routes\n *     responses:\n *       '200':\n *         description: Response from delivery service\n *   post:\n *     summary: Proxy POST requests to delivery service\n *     tags:\n *       - Delivery Routes\n *     responses:\n *       '200':\n *         description: Response from delivery service\n */\n\nexport {};\n