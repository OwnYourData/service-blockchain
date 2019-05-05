Rails.application.routes.draw do
	namespace :api, defaults: { format: :json } do
		scope module: :v1, constraints: ApiConstraints.new(version: 1, default: true) do
			match 'create',  to: 'docs#create',  via: 'get'
			match 'tx_info', to: 'docs#tx_info', via: 'get'
			match 'balance', to: 'docs#balance', via: 'get'
		end
	end
end
