import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';

@WebSocketGateway({
  cors: {
    origin: '*',
  },
})
export class WebsocketGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  handleConnection(client: Socket) {
    console.log(`Client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    console.log(`Client disconnected: ${client.id}`);
  }

  @SubscribeMessage('subscribeDeployment')
  handleSubscribeDeployment(client: Socket, deploymentId: string) {
    client.join(`deployment:${deploymentId}`);
    console.log(`Client ${client.id} subscribed to deployment:${deploymentId}`);
    return { status: 'subscribed', deploymentId };
  }

  emitDeploymentStatus(deploymentId: string, status: string, details?: any) {
    this.server.to(`deployment:${deploymentId}`).emit('deploymentStatus', {
      deploymentId,
      status,
      timestamp: new Date().toISOString(),
      ...details,
    });
  }
}
