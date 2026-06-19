import { Router } from 'express';
import { asyncHandler } from '../../core/async-handler.js';
import { metaWhatsAppWebhookController } from './controllers/meta-whatsapp-webhook.controller.js';
export const whatsappRouter = Router();
whatsappRouter.get('/webhook/meta', metaWhatsAppWebhookController.verify);
whatsappRouter.post('/webhook/meta', metaWhatsAppWebhookController.receive);
