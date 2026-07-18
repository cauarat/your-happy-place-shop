import smtplib
import os
import sys
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart

def get_env_vars():
    # Carregar variáveis do .env manualmente (para não precisar instalar dependências)
    env_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), '.env')
    env_vars = {}
    if os.path.exists(env_path):
        with open(env_path, 'r') as f:
            for line in f:
                line = line.strip()
                if line and not line.startswith('#') and '=' in line:
                    key, val = line.split('=', 1)
                    # Remover aspas se existirem
                    env_vars[key.strip()] = val.strip().strip('"').strip("'")
    return env_vars

def test_email():
    env_vars = get_env_vars()
    
    sender_email = env_vars.get("GMAIL_USER")
    app_password = env_vars.get("GMAIL_APP_PASSWORD")

    if not sender_email or sender_email == "seu-email@gmail.com":
        print("❌ Erro: GMAIL_USER não está configurado corretamente no arquivo .env!")
        print("Por favor, abra o arquivo .env e coloque seu e-mail real.")
        sys.exit(1)
        
    if not app_password:
        print("❌ Erro: GMAIL_APP_PASSWORD não encontrado no arquivo .env!")
        sys.exit(1)

    print(f"Tentando conectar ao servidor do Gmail usando o e-mail: {sender_email}")
    
    # Remover espaços da senha de app, caso existam
    app_password = app_password.replace(" ", "")

    msg = MIMEMultipart()
    msg['From'] = sender_email
    msg['To'] = sender_email
    msg['Subject'] = '🚀 Teste do Robô Villa Oro - Fase L (Link) Concluída!'

    body = """
    Olá!
    Se você está lendo este e-mail, significa que a conexão SMTP do seu Robô foi um sucesso!
    A Fase L (Link) do método V.L.A.E.G está 100% pronta.
    
    Agora podemos passar para a Fase A (Arquitetura)!
    """
    msg.attach(MIMEText(body, 'plain'))

    try:
        # Configuração do Servidor SMTP do Gmail
        server = smtplib.SMTP('smtp.gmail.com', 587)
        server.starttls() # Iniciar conexão segura
        server.login(sender_email, app_password)
        
        text = msg.as_string()
        server.sendmail(sender_email, sender_email, text)
        server.quit()
        
        print("✅ E-mail enviado com sucesso! Verifique a caixa de entrada do seu Gmail.")
    except Exception as e:
        print(f"❌ Erro ao enviar e-mail:\n{e}")
        sys.exit(1)

if __name__ == '__main__':
    test_email()
