import { WebSocketGateway, WebSocketServer, OnGatewayConnection, OnGatewayDisconnect } from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';

@WebSocketGateway({ cors: true, namespace: '/whatsapp' })
export class WhatsAppGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer() server!: Server;
  private logger = new Logger(WhatsAppGateway.name);

  handleConnection(client: Socket) {
    this.logger.log(`Client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);
  }

  notifyNewMessage(companyId: string, message: any) {
    this.server.to(companyId).emit('newMessage', message);
  }

  notifyStatusUpdate(companyId: string, status: any) {
    this.server.to(companyId).emit('statusUpdate', status);
  }
}
