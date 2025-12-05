import socket

def send_tcp_message(host, port, message):
    """
    Sends a message to a TCP server and returns the response.
    
    Args:
        host (str): The server hostname or IP address.
        port (int): The server port.
        message (str): The message to send.
        
    Returns:
        str: The response from the server.
    """
    # Create a TCP/IP socket
    sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    
    try:
        # Connect the socket to the port where the server is listening
        print(f"Connecting to {host} port {port}")
        sock.connect((host, port))
        
        # Send data
        print(f"Sending: {message}")
        sock.sendall(message.encode('utf-8'))
        
        # Look for the response
        amount_received = 0
        amount_expected = len(message)
        
        # Receive data (buffer size 1024 bytes)
        data = sock.recv(1024)
        response = data.decode('utf-8')
        print(f"Received: {response}")
        return response

    except Exception as e:
        print(f"An error occurred: {e}")
    finally:
        print("Closing connection")
        sock.close()

if __name__ == "__main__":
    # Example usage
    # Replace with your target host and port
    TARGET_HOST = "localhost" 
    TARGET_PORT = 8080
    MESSAGE = "Hello, Server!"
    
    # Note: This will fail if no server is running at the target address
    # send_tcp_message(TARGET_HOST, TARGET_PORT, MESSAGE)
