from typing import Dict, Set

from fastapi import WebSocket


class CollaborationManager:

    def __init__(self):

        self.active_connections: Dict[
            int,
            Set[WebSocket]
        ] = {}

        self.connection_users: Dict[
            WebSocket,
            int
        ] = {}

    async def connect(
        self,
        document_id: int,
        websocket: WebSocket,
        user_id: int
    ):

        await websocket.accept()

        if document_id not in self.active_connections:

            self.active_connections[
                document_id
            ] = set()

        self.active_connections[
            document_id
        ].add(websocket)

        self.connection_users[
            websocket
        ] = user_id

    def disconnect(
        self,
        document_id: int,
        websocket: WebSocket
    ):

        if document_id in self.active_connections:

            self.active_connections[
                document_id
            ].discard(websocket)

            if not self.active_connections[
                document_id
            ]:

                del self.active_connections[
                    document_id
                ]

        self.connection_users.pop(
            websocket,
            None
        )

    async def broadcast(
        self,
        document_id: int,
        message: dict,
        exclude: WebSocket | None = None
    ):

        connections = self.active_connections.get(
            document_id,
            set()
        )

        disconnected = []

        for websocket in connections:

            if websocket == exclude:
                continue

            try:

                await websocket.send_json(
                    message
                )

            except Exception:

                disconnected.append(
                    websocket
                )

        for websocket in disconnected:

            self.disconnect(
                document_id,
                websocket
            )

    async def send_to_user(
        self,
        document_id: int,
        user_id: int,
        message: dict
    ):

        connections = self.active_connections.get(
            document_id,
            set()
        )

        for websocket in connections:

            connected_user_id = (
                self.connection_users.get(
                    websocket
                )
            )

            if connected_user_id == user_id:

                try:

                    await websocket.send_json(
                        message
                    )

                except Exception:

                    self.disconnect(
                        document_id,
                        websocket
                    )

    def get_online_users(
        self,
        document_id: int
    ) -> list[int]:

        connections = self.active_connections.get(
            document_id,
            set()
        )

        users = {
            self.connection_users[websocket]
            for websocket in connections
            if websocket in self.connection_users
        }

        return sorted(users)

    def get_online_count(
        self,
        document_id: int
    ) -> int:

        return len(
            self.get_online_users(
                document_id
            )
        )


collaboration_manager = CollaborationManager()