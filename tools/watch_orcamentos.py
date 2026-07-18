import time
import subprocess
import os

def watch():
    print("==================================================")
    print("👀 VIGIA DO ROBÔ ATIVADO!")
    print("Ele vai checar a planilha a cada 60 segundos.")
    print("Pressione Ctrl+C para parar.")
    print("==================================================\n")
    
    script_path = os.path.join(os.path.dirname(__file__), "robo_orcamentos.py")
    
    while True:
        try:
            print(f"[{time.strftime('%H:%M:%S')}] Checando planilha...")
            
            # Executa o robo capturando o output para não sujar muito o terminal
            # se não enviou nada
            result = subprocess.run(
                ["python3", script_path], 
                capture_output=True, 
                text=True
            )
            
            output = result.stdout
            
            # Se enviou alguém (podemos checar se teve 'Enviado para')
            if "Enviandos com sucesso: 0" not in output and "Enviados com sucesso: 0" not in output:
                # Algo foi enviado ou teve erro, vamos imprimir o log inteiro
                # Para filtrar só se realmente processou algo, podemos buscar a string de sucesso
                if "Enviando para" in output:
                    print("\n🚀 NOVO ORÇAMENTO ENCONTRADO E ENVIADO!")
                    print(output)
                    print("--------------------------------------------------\n")
            
        except KeyboardInterrupt:
            print("\nVigia desligado pelo usuário.")
            break
        except Exception as e:
            print(f"[{time.strftime('%H:%M:%S')}] Erro inesperado: {e}")
        
        # Dorme por 60 segundos
        time.sleep(60)

if __name__ == "__main__":
    watch()
