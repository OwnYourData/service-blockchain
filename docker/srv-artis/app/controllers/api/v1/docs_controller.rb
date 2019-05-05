module Api
    module V1
        class DocsController < ApiController
            # respond only to JSON requests
            respond_to :json
            respond_to :html, only: []
            respond_to :xml, only: []

            def create
            	payload = params[:hash].to_s
            	provider = ENV["PROVIDER"].to_s
            	key = ENV["PRIVATE_KEY"].to_s

            	f = IO.popen("node script/create.js #{provider} #{key} #{payload}")
            	tx_hash = f.gets.strip

                render json: {"tx": tx_hash.to_s}, 
                       status: 200
            end

            def tx_info
            	tx_hash = params[:tx].to_s
            	provider = ENV["PROVIDER"].to_s
            	retVal = `node script/tx.js #{provider} #{tx_hash}`
            	info = JSON.parse(retVal.gsub(/([a-zA-Z]+):/, '"\1":').gsub("'",'"'))
            	block = info["blockNumber"].to_s
            	retVal = `node script/block.js #{provider} #{block}`
            	blockInfo = JSON.parse(retVal.gsub(/([a-zA-Z3]+):/, '"\1":').gsub("'",'"'))

                render json: { "from": info["from"].to_s,
                	           "gas": info["gas"].to_i,
                			   "input": info["input"].to_s,
                			   "block": block.to_i,
                			   "timestamp": blockInfo["timestamp"] }, 
                       status: 200

            end

            def balance
            	provider = ENV["PROVIDER"].to_s
            	key = ENV["PRIVATE_KEY"].to_s
            	balance = `node script/balance.js #{provider} #{key}`
            	render json: {"balance": balance.to_i},
            		   status: 200
            end
        end
    end
end